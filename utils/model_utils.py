"""
Model utility functions for working with embeddings and the recommendation model
"""
import os
import numpy as np
import mysql.connector
from db_config import DB_CONFIG
import torch
import traceback

def get_model_metadata(model_name=None):
    """
    Get model metadata from the database
    If model_name is specified, return only that model's metadata
    Otherwise, return all active models
    """
    try:
        # Connect to database
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor(dictionary=True)
        
        if model_name:
            # Get specific model metadata
            query = "SELECT * FROM model_metadata WHERE model_name = %s AND active = TRUE"
            cursor.execute(query, (model_name,))
        else:
            # Get all active models
            query = "SELECT * FROM model_metadata WHERE active = TRUE"
            cursor.execute(query)
        
        results = cursor.fetchall()
        
        cursor.close()
        cnx.close()
        
        return results
    except Exception as e:
        print(f"Error getting model metadata: {e}")
        traceback.print_exc()
        return []

def load_embeddings(embedding_path):
    """
    Load embeddings from file
    Returns the embeddings and their shape information
    """
    try:
        if not os.path.exists(embedding_path):
            print(f"Embedding file not found: {embedding_path}")
            return None, (0, 0)
        
        embeddings = np.load(embedding_path)
        
        # Get embedding dimensions
        if len(embeddings.shape) == 2:
            num_items, dims = embeddings.shape
        else:
            num_items, dims = embeddings.shape[0], 0
            
        print(f"Loaded embeddings: {embedding_path}")
        print(f"  - Shape: {embeddings.shape}")
        print(f"  - Items: {num_items}")
        print(f"  - Dimensions: {dims}")
        
        return embeddings, (num_items, dims)
    except Exception as e:
        print(f"Error loading embeddings: {e}")
        traceback.print_exc()
        return None, (0, 0)

def get_embeddings_for_model(model_name="roberta_destination_model"):
    """
    Get embeddings for the specified model from the database metadata
    """
    try:
        # Get model metadata
        model_info = get_model_metadata(model_name)
        
        if not model_info:
            print(f"No metadata found for model: {model_name}")
            return None
        
        # Get embedding path from metadata
        embedding_path = model_info[0].get('embedding_path')
        
        if not embedding_path:
            print(f"No embedding path found for model: {model_name}")
            return None
        
        # Load embeddings
        embeddings, _ = load_embeddings(embedding_path)
        
        return embeddings
    except Exception as e:
        print(f"Error getting embeddings for model: {e}")
        traceback.print_exc()
        return None

def get_destinations_with_embeddings(limit=None):
    """
    Get destinations from the database along with their embeddings
    Returns a tuple of (destinations_df, embeddings)
    """
    try:
        # Connect to database
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor(dictionary=True)
        
        # Get destinations
        limit_clause = f"LIMIT {limit}" if limit else ""
        query = f"""
        SELECT id, name, city, province, description, category, ratings, budget, latitude, longitude 
        FROM destinations 
        ORDER BY id {limit_clause}
        """
        cursor.execute(query)
        destinations = cursor.fetchall()
        
        cursor.close()
        cnx.close()
        
        if not destinations:
            print("No destinations found in database")
            return None, None
        
        # Import pandas here to avoid circular imports
        import pandas as pd
        
        # Convert to dataframe
        df = pd.DataFrame(destinations)
        
        # Get embeddings
        embeddings = get_embeddings_for_model("roberta_destination_model")
        
        # Check if embeddings match destinations
        if embeddings is not None and len(embeddings) != len(df):
            print(f"Warning: Number of embeddings ({len(embeddings)}) doesn't match number of destinations ({len(df)})")
            
            # If we have more destinations than embeddings, truncate destinations
            if len(df) > len(embeddings):
                print(f"Truncating destinations to match embeddings")
                df = df.iloc[:len(embeddings)]
            # If we have more embeddings than destinations, truncate embeddings
            else:
                print(f"Truncating embeddings to match destinations")
                embeddings = embeddings[:len(df)]
        
        return df, embeddings
    except Exception as e:
        print(f"Error getting destinations with embeddings: {e}")
        traceback.print_exc()
        return None, None

def encode_text(text, tokenizer, model, max_length=512, device="cpu"):
    """
    Encode text using a transformer model
    Returns the encoded text embedding
    """
    try:
        # Import torch here to avoid circular imports
        import torch
        
        # Tokenize the text
        encoding = tokenizer(
            text,
            add_special_tokens=True,
            max_length=max_length,
            return_token_type_ids=False,
            padding="max_length",
            truncation=True,
            return_attention_mask=True,
            return_tensors="pt"
        ).to(device)
        
        # Get the embeddings
        with torch.no_grad():
            outputs = model.roberta(
                input_ids=encoding["input_ids"],
                attention_mask=encoding["attention_mask"]
            )
            embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()
        
        return embedding
    except Exception as e:
        print(f"Error encoding text: {e}")
        traceback.print_exc()
        return None

def find_similar_destinations(query_text, tokenizer, model, top_k=10, filter_city=None, filter_category=None):
    """
    Find destinations similar to the query text
    Returns a list of destinations sorted by similarity
    """
    try:
        # Get destinations and embeddings
        df, dest_embeddings = get_destinations_with_embeddings()
        
        if df is None or dest_embeddings is None:
            print("Could not get destinations or embeddings")
            return []
        
        # Get device
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Encode the query
        query_embedding = encode_text(query_text, tokenizer, model, device=device)
        
        if query_embedding is None:
            print("Could not encode query text")
            return []
        
        # Calculate cosine similarity
        from sklearn.metrics.pairwise import cosine_similarity
        similarities = cosine_similarity(query_embedding, dest_embeddings)[0]
        
        # Apply filters if specified
        mask = np.ones(len(df), dtype=bool)
        
        if filter_city:
            city_mask = df["city"].str.lower() == filter_city.lower()
            mask = mask & city_mask.values
            
        if filter_category:
            category_mask = df["category"].str.lower() == filter_category.lower()
            mask = mask & category_mask.values
        
        # Apply mask and get top K
        masked_similarities = similarities.copy()
        masked_similarities[~mask] = -1  # Set filtered out items to -1
        
        # Get indices of top K items
        if top_k > 0:
            top_indices = masked_similarities.argsort()[-top_k:][::-1]
        else:
            # Get all items with positive similarity
            top_indices = np.where(masked_similarities > 0)[0]
        
        # Get top destinations and their similarities
        top_destinations = []
        
        for idx in top_indices:
            if masked_similarities[idx] > 0:  # Only include positive similarities
                dest = df.iloc[idx].to_dict()
                dest["similarity"] = float(similarities[idx])
                top_destinations.append(dest)
        
        return top_destinations
    except Exception as e:
        print(f"Error finding similar destinations: {e}")
        traceback.print_exc()
        return []

if __name__ == "__main__":
    # Test the utilities
    print("Testing model utilities...")
    
    # Get model metadata
    model_info = get_model_metadata()
    print(f"Found {len(model_info)} model(s) in database")
    
    # Get embeddings
    embeddings = get_embeddings_for_model()
    if embeddings is not None:
        print(f"Loaded embeddings successfully")
    
    # Get destinations with embeddings
    df, embeddings = get_destinations_with_embeddings(limit=5)
    if df is not None:
        print(f"Loaded {len(df)} destinations")
        print(df[["name", "city", "category"]].head()) 