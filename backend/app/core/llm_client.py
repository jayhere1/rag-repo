from openai import AzureOpenAI
from typing import List, Dict
from .config import settings


from openai import AzureOpenAI
from typing import List, Dict
from .config import settings
import inspect
import httpx


class LLMClient:
    def __init__(self):
        try:
            # Create a custom httpx client without any proxy settings
            http_client = httpx.Client()

            # Initialize Azure OpenAI clients for embeddings and chat
            self.embedding_client = AzureOpenAI(
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                http_client=http_client,
                default_headers={"Accept-Encoding": "identity"},
            )

            self.chat_client = AzureOpenAI(
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                http_client=http_client,
                default_headers={"Accept-Encoding": "identity"},
            )

            self.embedding_deployment = settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME
            self.chat_deployment = settings.AZURE_OPENAI_CHAT_DEPLOYMENT_NAME

        except Exception as e:
            print(f"Initialization error: {type(e).__name__}: {str(e)}")
            print(f"Error occurred in: {__file__}")
            raise

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a list of texts."""
        try:
            print(f"Getting embeddings for {len(texts)} texts")
            print(f"Using model: {self.embedding_deployment}")
            
            # Validate input
            if not texts:
                raise ValueError("No texts provided for embedding")
            
            # Ensure texts are not empty
            texts = [text.strip() for text in texts]
            if not all(texts):
                raise ValueError("One or more texts are empty")
            
            try:
                response = self.embedding_client.embeddings.create(
                    model=self.embedding_deployment, input=texts
                )
                embeddings = [item.embedding for item in response.data]
                print(f"Successfully generated {len(embeddings)} embeddings")
                return embeddings
            except Exception as e:
                print(f"Error from Azure OpenAI: {type(e).__name__}: {str(e)}")
                raise Exception(f"Azure OpenAI API error: {str(e)}")
        except Exception as e:
            print(f"Error in get_embeddings: {type(e).__name__}: {str(e)}")
            raise Exception(f"Failed to get embeddings: {str(e)}")

    def get_completion(
        self, query: str, context: List[Dict], max_tokens: int = 500
    ) -> str:
        """Generate completion using RAG context."""
        # Format context for the prompt
        formatted_context = "\n\n".join(
            f"Context {i + 1}:\n{item['text']}" for i, item in enumerate(context)
        )

        prompt = f"""Use the following contexts to answer the question. 
If you cannot find the answer in the contexts, say so.

{formatted_context}

Question: {query}

Answer:"""

        try:
            print(f"Attempting chat completion with deployment: {self.chat_deployment}")
            print(f"Query: {query}")
            print(f"Context length: {len(context)}")

            response = self.chat_client.chat.completions.create(
                model=self.chat_deployment,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that answers questions based on the provided context.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            print("Chat completion successful")
            return response.choices[0].message.content
        except Exception as e:
            print(f"Chat completion error: {type(e).__name__}: {str(e)}")
            print(
                f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No additional details'}"
            )
            raise Exception(f"Failed to get completion: {str(e)}")

    def get_query_embedding(self, query: str) -> List[float]:
        """Get embedding for a single query string."""
        try:
            response = self.embedding_client.embeddings.create(
                model=self.embedding_deployment, input=[query]
            )
            return response.data[0].embedding
        except Exception as e:
            raise Exception(f"Failed to get query embedding: {str(e)}")
