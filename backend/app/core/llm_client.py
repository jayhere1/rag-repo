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
        all_embeddings = []
        batch_size = 50  # Process 50 texts at a time

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            print(
                f"Getting embeddings for batch {i // batch_size + 1} of {(len(texts) + batch_size - 1) // batch_size}"
            )

            try:
                response = self.embedding_client.embeddings.create(
                    model=self.embedding_deployment, input=batch
                )
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
            except Exception as e:
                print(f"Error getting embeddings for batch: {str(e)}")
                # Retry with smaller batch if error occurs
                if len(batch) > 1:
                    print("Retrying with smaller batch size...")
                    half_size = len(batch) // 2
                    first_half = batch[:half_size]
                    second_half = batch[half_size:]

                    try:
                        # Process first half
                        response = self.embedding_client.embeddings.create(
                            model=self.embedding_deployment, input=first_half
                        )
                        all_embeddings.extend(
                            [item.embedding for item in response.data]
                        )

                        # Process second half
                        response = self.embedding_client.embeddings.create(
                            model=self.embedding_deployment, input=second_half
                        )
                        all_embeddings.extend(
                            [item.embedding for item in response.data]
                        )
                    except Exception as retry_error:
                        print(f"Error during retry: {str(retry_error)}")
                        raise Exception(
                            f"Failed to get embeddings even with smaller batch: {str(retry_error)}"
                        )
                else:
                    raise Exception(
                        f"Failed to get embedding for single text: {str(e)}"
                    )

        return all_embeddings

    def get_completion(
        self, query: str, context: List[Dict], max_tokens: int = 500
    ) -> str:
        """Generate completion using RAG context."""
        # Format context with numbers for citation
        formatted_context = "\n\n".join(
            f"Context {i + 1}:\n{item['text']}" for i, item in enumerate(context)
        )

        prompt = f"""Use the following numbered contexts to answer the question.
If you cannot find the answer in the contexts, say so.
Important: Use superscript numbers (e.g. ¹, ², ³) to cite your sources inline with the text.
For example: "The model uses a four-stage pipeline¹ and includes rejection sampling²."

{formatted_context}

Question: {query}

Answer (with citations):"""

        try:
            print(f"Attempting chat completion with deployment: {self.chat_deployment}")
            print(f"Query: {query}")
            print(f"Context length: {len(context)}")

            response = self.chat_client.chat.completions.create(
                model=self.chat_deployment,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that answers questions based on the provided context. Use superscript numbers to cite your sources inline with the text. Ensure each claim is supported by a citation.",
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
