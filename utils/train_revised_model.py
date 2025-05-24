"""
Train and export the revised recommendation model
"""

import os
import torch
import logging
import pandas as pd
import numpy as np
from tqdm import tqdm
from transformers import RobertaTokenizer
from torch.utils.data import DataLoader, Dataset
import database as db
from revised import DestinationRecommender, DestinationDataset

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
logger.info(f"Using device: {device}")

def main():
    # Output directory for the model
    output_dir = './model_output/'
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, 'roberta_destination_model.pt')
    
    # Step 1: Load data from database
    logger.info("Loading destinations from database...")
    all_destinations = db.get_destinations()  # Get all destinations
    
    if not all_destinations:
        logger.error("No destinations found in database. Cannot train model.")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(all_destinations)
    
    # Fill NaN values
    df = df.fillna("")
    logger.info(f"Loaded {len(df)} destinations from database")
    
    # Create combined text field
    df['combined_text'] = df.apply(
        lambda row: f"{row['name']} {row['city']} {row['province']} {row['category']} "
                  f"{row['description']} {row['metadata']} "
                  f"budget: {row['budget']} rating: {str(row['ratings'])}",
        axis=1
    )
    
    # Initialize tokenizer
    tokenizer = RobertaTokenizer.from_pretrained('roberta-base')
    
    # Create dataset
    texts = df['combined_text'].values
    labels = np.arange(len(df))  # Each destination is its own class
    
    # Create full dataset
    full_dataset = DestinationDataset(texts, labels, tokenizer)
    batch_size = 4  # Small batch size to avoid memory issues
    full_dataloader = DataLoader(full_dataset, batch_size=batch_size, shuffle=True)
    
    # Initialize model
    num_labels = len(df)
    model = DestinationRecommender(num_labels=num_labels).to(device)
    logger.info(f"Initialized model with {num_labels} labels")
    
    # Train model
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
    loss_fn = torch.nn.CrossEntropyLoss()
    
    logger.info("Starting training...")
    model.train()
    
    num_epochs = 3
    for epoch in range(num_epochs):
        total_loss = 0
        progress_bar = tqdm(full_dataloader, desc=f"Epoch {epoch + 1}/{num_epochs}")
        for batch in progress_bar:
            optimizer.zero_grad()
            
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)
            
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            loss = loss_fn(outputs, labels)
            
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            progress_bar.set_postfix({'loss': loss.item()})
        
        avg_loss = total_loss / len(full_dataloader)
        logger.info(f"Epoch {epoch + 1}/{num_epochs}, Average Loss: {avg_loss:.4f}")
    
    # Save model
    logger.info(f"Saving model to {model_path}...")
    torch.save(model.state_dict(), model_path)
    
    # Create embeddings
    logger.info("Creating embeddings...")
    model.eval()
    embeddings = []
    
    with torch.no_grad():
        for batch in tqdm(full_dataloader, desc="Creating embeddings"):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            
            outputs = model.roberta(input_ids=input_ids, attention_mask=attention_mask)
            batch_embeddings = outputs.last_hidden_state[:, 0, :].cpu().numpy()
            embeddings.append(batch_embeddings)
    
    embeddings = np.vstack(embeddings)
    
    # Save embeddings
    embeddings_path = os.path.join(output_dir, 'destination_embeddings.npy')
    np.save(embeddings_path, embeddings)
    logger.info(f"Saved embeddings with shape {embeddings.shape}")
    
    logger.info("Training completed successfully.")

if __name__ == "__main__":
    main() 