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
        # Group contexts by source document to avoid duplicate citations
        doc_contexts = {}
        for item in context:
            doc_id = item["metadata"]["filename"]
            if doc_id not in doc_contexts:
                doc_contexts[doc_id] = []
            doc_contexts[doc_id].append(item["text"])

        # Format context with numbers for citation, using document as the basis
        formatted_contexts = []
        for i, (doc_id, texts) in enumerate(doc_contexts.items()):
            # Join all contexts from the same document
            doc_text = "\n".join(texts)
            formatted_contexts.append(f"Context {i + 1} (from {doc_id}):\n{doc_text}")

        formatted_context = "\n\n".join(formatted_contexts)

        prompt = f"""Use the following numbered contexts to answer the question.
If you cannot find the answer in the contexts, say so.
Important instructions for response format:
1. First provide your answer, using superscript numbers (e.g. ¹) to cite sources
2. Then add a blank line
3. Then write "Citation" as a header
4. Then list ONLY the documents you cited in your answer, numbered to match your citations
5. Do not add the word "Citation" anywhere except as the final section header
6. Do not list any sources that weren't cited in your answer
7. Do not list the same source multiple times

Example answer format:
The model uses a four-stage pipeline¹ and includes rejection sampling².

[Your answer should end here, followed by exactly two newlines before the Citation section]

Citation
1. pipeline_docs.pdf
2. sampling_guide.pdf

{formatted_context}

Question: {query}

Answer (with citations, followed by two newlines and then the Citation section):"""

        try:
            print(f"Attempting chat completion with deployment: {self.chat_deployment}")
            print(f"Query: {query}")
            print(f"Number of source documents: {len(doc_contexts)}")

            response = self.chat_client.chat.completions.create(
                model=self.chat_deployment,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that answers questions based on the provided context. Use superscript numbers to cite sources in your answer. After your answer, add exactly two newlines, then a 'Citation' section that lists only the sources you actually cited. The word 'Citation' should only appear once, at the start of the citation list. Keep your answer focused and concise.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.3,
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
