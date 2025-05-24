import os
import sys
import torch
import numpy as np
import importlib.util
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the utils directory to the path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

# Constants
MODEL_OUTPUT_DIR = os.path.join(CURRENT_DIR, 'model_output')
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Global variables
model = None
df = None
embeddings = None
tokenizer = None

# Initialize model state
logger.info(f"Using device: {device}")

# Import from revised.py
def import_model_components():
    try:
        # Use importlib.util to load the revised module
        revised_path = os.path.join(CURRENT_DIR, "revised.py")
        spec = importlib.util.spec_from_file_location("travel_model", revised_path)
        travel_model = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(travel_model)
        
        # Import the required components from revised.py
        return travel_model.DestinationRecommender, travel_model.extract_query_info, travel_model.load_data, travel_model.preprocess_data
    except Exception as e:
        logger.error(f"Error importing from revised.py: {e}")
        raise

# Load model from saved state
def load_model():
    """
    Load the recommendation model and destination data
    """
    # Check if model output directory exists
    model_path = os.path.join(MODEL_OUTPUT_DIR, 'wertigo.pt')
    data_file = os.path.join(CURRENT_DIR, "final_dataset.csv")
    
    # Check if data file exists
    if not os.path.exists(data_file):
        logger.error(f"Data file not found: {data_file}")
        logger.error("Please ensure final_dataset.csv exists in the utils directory.")
        return None, None, None
    
    try:
        # Load and preprocess data first
        DestinationRecommender, extract_query_info, load_data, preprocess_data = import_model_components()
        
        # Load the dataset
        data_df = load_data(data_file)
        data_df, label_encoder = preprocess_data(data_df)
        
        logger.info(f"Dataset loaded with {len(data_df)} destinations")
        
        # Get the correct number of labels
        num_labels = len(label_encoder.classes_)
        logger.info(f"Number of categories (labels): {num_labels}")
        
        # Initialize model with correct architecture
        loaded_model = DestinationRecommender(num_labels=num_labels).to(device)
        
        # Try to load existing model
        if os.path.exists(model_path):
            try:
                # Load saved weights
                saved_state = torch.load(model_path, map_location=device)
                loaded_model.load_state_dict(saved_state)
                logger.info(f"Model loaded successfully from {model_path}")
            except Exception as e:
                logger.warning(f"Error loading existing model: {e}")
                logger.info("The saved model architecture doesn't match current architecture.")
                logger.info("Removing old model and will retrain if needed...")
                
                # Remove the incompatible model files
                try:
                    if os.path.exists(model_path):
                        os.remove(model_path)
                        logger.info("Removed incompatible model file")
                    
                    # Also remove related files
                    embeddings_path = os.path.join(MODEL_OUTPUT_DIR, 'destination_embeddings.npy')
                    if os.path.exists(embeddings_path):
                        os.remove(embeddings_path)
                        logger.info("Removed incompatible embeddings file")
                        
                    indices_path = os.path.join(MODEL_OUTPUT_DIR, 'embedding_indices.npy')
                    if os.path.exists(indices_path):
                        os.remove(indices_path)
                        logger.info("Removed incompatible indices file")
                except Exception as cleanup_error:
                    logger.warning(f"Error cleaning up old files: {cleanup_error}")
                
                # The model is initialized but not trained, will need training
                logger.info("Model initialized but needs training. Run revised.py to train the model.")
        else:
            logger.info("No existing model found. Model initialized but needs training.")
        
        loaded_model.eval()
        return loaded_model, data_df, label_encoder
        
    except Exception as e:
        logger.error(f"Error in load_model: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None

# Load embeddings from file or create them
def get_embeddings(model, df):
    """
    Load or create embeddings for destinations
    """
    embeddings_path = os.path.join(MODEL_OUTPUT_DIR, 'destination_embeddings.npy')
    
    try:
        if os.path.exists(embeddings_path):
            loaded_embeddings = np.load(embeddings_path)
            # Check if the shape matches our current data
            if len(loaded_embeddings) == len(df):
                logger.info(f"Loaded embeddings for {len(loaded_embeddings)} destinations.")
                return loaded_embeddings
            else:
                logger.warning(f"Embeddings size mismatch. Expected {len(df)}, got {len(loaded_embeddings)}. Creating new embeddings...")
        else:
            logger.info("Embeddings file not found. Creating new embeddings...")
        
        # If embeddings don't exist or don't match, create them
        logger.info(f"Generating embeddings for {len(df)} destinations...")
        embeddings = []
        
        # Process in batches to avoid memory issues
        batch_size = 8  # Smaller batch size for safety
        for i in range(0, len(df), batch_size):
            batch_df = df.iloc[i:i + batch_size]
            if i % 32 == 0:  # Log every 32 items
                logger.info(f"Processing destinations {i}/{len(df)}...")
            
            with torch.no_grad():
                for _, row in batch_df.iterrows():
                    # Use the combined_text field
                    text = str(row['combined_text'])
                    
                    # Truncate if too long
                    if len(text) > 1000:
                        text = text[:1000]
                    
                    encoding = tokenizer(
                        text,
                        add_special_tokens=True,
                        max_length=512,
                        return_token_type_ids=False,
                        padding='max_length',
                        truncation=True,
                        return_attention_mask=True,
                        return_tensors='pt'
                    ).to(device)
                    
                    outputs = model.roberta(
                        input_ids=encoding['input_ids'],
                        attention_mask=encoding['attention_mask']
                    )
                    embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()
                    embeddings.append(embedding[0])  # Remove the batch dimension
        
        # Convert to numpy array
        embeddings = np.array(embeddings)
        
        # Verify the embeddings shape
        if len(embeddings) != len(df):
            logger.error(f"Generated embeddings count ({len(embeddings)}) doesn't match destinations count ({len(df)})")
            return np.array([])
        
        # Save the embeddings
        try:
            os.makedirs(os.path.dirname(embeddings_path), exist_ok=True)
            np.save(embeddings_path, embeddings)
            logger.info(f"Saved embeddings for {len(embeddings)} destinations.")
        except Exception as e:
            logger.warning(f"Failed to save embeddings: {e}")
        
        return embeddings
        
    except Exception as e:
        logger.error(f"Error creating embeddings: {e}")
        import traceback
        traceback.print_exc()
        return np.array([])

# Initialize the model at module import time
def init_model():
    """
    Initialize the model, data, and embeddings
    """
    global model, df, embeddings, tokenizer
    
    try:
        logger.info("Loading recommendation model...")
        model, df, label_encoder = load_model()
        
        if model is not None and df is not None:
            # Initialize tokenizer from transformers
            from transformers import RobertaTokenizer
            tokenizer = RobertaTokenizer.from_pretrained('roberta-base')
            
            logger.info("Loading embeddings...")
            embeddings = get_embeddings(model, df)
            if embeddings is None or len(embeddings) == 0:
                logger.warning("No embeddings available. Some features may not work correctly.")
                logger.info("You may need to train the model first by running: python revised.py")
        else:
            logger.warning("Model or data not available. Recommendation features will be limited.")
            logger.info("Please ensure final_dataset.csv exists and run: python revised.py to train the model")
            
    except Exception as e:
        logger.error(f"Error initializing model: {e}")
        logger.error("Starting with limited functionality. Recommendation features will not be available.")

# Initialize the model when this module is imported
init_model() 