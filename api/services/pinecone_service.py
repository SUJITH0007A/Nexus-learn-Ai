# services/pinecone_service.py
from pinecone import Pinecone, ServerlessSpec
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from core.config import settings

# Initialize Pinecone client safely
pc = None
if settings.PINECONE_API_KEY:
    try:
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    except:
        pass

def get_or_create_index(index_name: str, dimension: int = 1536):
    """
    Get an existing index or create a new one if it doesn't exist.
    """
    if not pc:
        raise ValueError("Pinecone API key is not configured.")
    # Get a list of indexes and check if our index exists
    index_list = pc.list_indexes().names()
    
    if index_name not in index_list:
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric="cosine",  # Options: cosine, euclidean, dotproduct
            spec=ServerlessSpec(cloud="aws", region=settings.PINECONE_ENVIRONMENT)
        )
    
    return pc.Index(index_name)

def store_in_index(index_name: str, documents: list):
    """
    Generate embeddings for the document chunks and store them in Pinecone.
    """
    embeddings = OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)
    index = get_or_create_index(index_name)
    vector_store = LangchainPinecone(index=index, embedding=embeddings)
    vector_store.add_documents(documents)

def query_index(index_name: str, query: str, top_k: int = 5):
    """
    Query the specified Pinecone index for relevant documents.
    """
    embeddings = OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)
    index = get_or_create_index(index_name)
    vector_store = LangchainPinecone(index=index, embedding=embeddings)
    retriever = vector_store.as_retriever()
    return retriever.get_relevant_documents(query, k=top_k)
