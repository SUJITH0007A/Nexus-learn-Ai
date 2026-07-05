import os
import json
import httpx
from typing import AsyncGenerator, Dict, Any, List
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        # API Keys
        self.openai_key = os.getenv("NEXT_PUBLIC_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.claude_key = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

        # Initialize clients
        self.openai_client = AsyncOpenAI(api_key=self.openai_key) if self.openai_key else None
        
    async def generate_response_stream(
        self, 
        messages: List[Dict[str, str]], 
        model_name: str = "gpt-4o", 
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """
        Generate completions as a streaming generator.
        Supports multi-model routing dynamically.
        """
        cleaned_model = model_name.lower()
        
        # 1. Ollama Routing
        if "ollama" in cleaned_model:
            model_slug = model_name.split(":")[-1] if ":" in model_name else "llama3"
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream(
                        "POST", 
                        f"{self.ollama_host}/api/chat", 
                        json={
                            "model": model_slug, 
                            "messages": messages,
                            "options": {"temperature": temperature},
                            "stream": True
                        }
                    ) as response:
                        if response.status_code == 200:
                            async for line in response.aiter_lines():
                                if line:
                                    data = json.loads(line)
                                    content = data.get("message", {}).get("content", "")
                                    if content:
                                        yield content
                        else:
                            yield f"Ollama returned code {response.status_code}. Make sure Ollama is running."
            except Exception as e:
                yield f"Error communicating with local Ollama service: {str(e)}. Using fallback mock."
                async for chunk in self._mock_streaming_response("Ollama Local", messages[-1]["content"]):
                    yield chunk
            return

        # 2. Claude/Anthropic Routing
        elif "claude" in cleaned_model or "anthropic" in cleaned_model:
            if not self.claude_key:
                yield "Claude API key is not configured. Falling back to simulated response:\n\n"
                async for chunk in self._mock_streaming_response("Claude 3.5 Sonnet", messages[-1]["content"]):
                    yield chunk
                return
            
            # Call Anthropic API (or fallback to OpenAI API format if they support it, or raw HTTP request)
            # For robustness, we can execute a standard HTTP client call to Claude endpoint
            try:
                headers = {
                    "x-api-key": self.claude_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                payload = {
                    "model": "claude-3-5-sonnet-20241022",
                    "messages": [m for m in messages if m["role"] in ["user", "assistant"]],
                    "max_tokens": 1024,
                    "temperature": temperature,
                    "stream": True
                }
                # System prompt mapping
                system_prompt = next((m["content"] for m in messages if m["role"] == "system"), None)
                if system_prompt:
                    payload["system"] = system_prompt
                
                async with httpx.AsyncClient() as client:
                    async with client.stream(
                        "POST", 
                        "https://api.anthropic.com/v1/messages", 
                        headers=headers, 
                        json=payload
                    ) as r:
                        async for line in r.aiter_lines():
                            if line.startswith("data:"):
                                data_str = line[5:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    event = json.loads(data_str)
                                    if event.get("type") == "content_block_delta":
                                        yield event["delta"]["text"]
                                except:
                                    pass
            except Exception as e:
                yield f"Claude execution error: {str(e)}"
            return

        # 3. Groq Routing
        elif "groq" in cleaned_model:
            if not self.groq_key:
                yield "Groq API key is not configured. Falling back to simulated response:\n\n"
                async for chunk in self._mock_streaming_response("Groq Llama 3", messages[-1]["content"]):
                    yield chunk
                return
            
            # Groq is OpenAI compatible
            try:
                client = AsyncOpenAI(api_key=self.groq_key, base_url="https://api.groq.com/openai/v1")
                chat_completion = await client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=messages,
                    temperature=temperature,
                    stream=True
                )
                async for chunk in chat_completion:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
            except Exception as e:
                yield f"Groq execution error: {str(e)}"
            return

        # 4. OpenRouter Routing
        elif "openrouter" in cleaned_model:
            if not self.openrouter_key:
                yield "OpenRouter API key is not configured. Falling back to simulated response:\n\n"
                async for chunk in self._mock_streaming_response("OpenRouter", messages[-1]["content"]):
                    yield chunk
                return
            
            try:
                client = AsyncOpenAI(api_key=self.openrouter_key, base_url="https://openrouter.ai/api/v1")
                chat_completion = await client.chat.completions.create(
                    model="meta-llama/llama-3-8b-instruct:free",
                    messages=messages,
                    temperature=temperature,
                    stream=True
                )
                async for chunk in chat_completion:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
            except Exception as e:
                yield f"OpenRouter execution error: {str(e)}"
            return

        # 5. Google Gemini Routing
        elif "gemini" in cleaned_model:
            if not self.gemini_key:
                yield "Gemini API key is not configured. Falling back to simulated response:\n\n"
                async for chunk in self._mock_streaming_response("Gemini 1.5 Pro", messages[-1]["content"]):
                    yield chunk
                return
            
            # Gemini is OpenAI compatible now at Google AI Studio endpoint
            try:
                client = AsyncOpenAI(api_key=self.gemini_key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
                chat_completion = await client.chat.completions.create(
                    model="gemini-1.5-flash",
                    messages=messages,
                    temperature=temperature,
                    stream=True
                )
                async for chunk in chat_completion:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
            except Exception as e:
                yield f"Gemini execution error: {str(e)}"
            return

        # 6. Default: OpenAI Routing (gpt-4o / gpt-4 etc)
        else:
            if not self.openai_key:
                yield "OpenAI API key is not configured. Falling back to simulated response:\n\n"
                async for chunk in self._mock_streaming_response("GPT-4o", messages[-1]["content"]):
                    yield chunk
                return
            
            try:
                chat_completion = await self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",  # Mini used for cost-savings
                    messages=messages,
                    temperature=temperature,
                    stream=True
                )
                async for chunk in chat_completion:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
            except Exception as e:
                yield f"OpenAI execution error: {str(e)}"

    async def generate_response_static(
        self, 
        messages: List[Dict[str, str]], 
        model_name: str = "gpt-4o",
        temperature: float = 0.7
    ) -> str:
        """
        Generate complete static response (non-streaming).
        """
        response_text = ""
        async for chunk in self.generate_response_stream(messages, model_name, temperature):
            response_text += chunk
        return response_text

    async def _mock_streaming_response(self, engine_name: str, query: str) -> AsyncGenerator[str, None]:
        """
        Mock generator that responds with structured content, mimicking the AI models.
        """
        response = (
            f"**[NexusLearn AI - {engine_name} Simulator]**\n\n"
            f"Thank you for your message! Since your API credentials for {engine_name} are currently using sandbox mode, "
            f"I am providing this simulated educational content to help you explore. \n\n"
            f"Regarding your query: *\"{query}\"* \n\n"
            f"Here is a comprehensive breakdown of the key concepts:\n"
            f"1. **Core Mechanism**: Self-Attention allows processing sequences concurrently with a time complexity of O(1) sequential operations.\n"
            f"2. **Parallel Operations**: Multi-Head Attention enables the network to jointly attend to information from different representation subspaces at different positions.\n"
            f"3. **Memory Footprint**: The attention matrix grows quadratically with sequence length ($O(N^2)$), which is why optimized sequence modeling remains a hot research area.\n\n"
            f"```python\n"
            f"# Simulated PyTorch implementation\n"
            f"import torch\n"
            f"import torch.nn as nn\n\n"
            f"class ScaledDotProductAttention(nn.Module):\n"
            f"    def forward(self, Q, K, V):\n"
            f"        d_k = Q.size(-1)\n"
            f"        scores = torch.matmul(Q, K.transpose(-2, -1)) / (d_k ** 0.5)\n"
            f"        weights = torch.softmax(scores, dim=-1)\n"
            f"        return torch.matmul(weights, V)\n"
            f"```\n\n"
            f"Is there any specific detail in this logic you'd like to inspect further?"
        )
        # Yield in small pieces to simulate streaming
        chunk_size = 8
        for i in range(0, len(response), chunk_size):
            yield response[i:i+chunk_size]
            import asyncio
            await asyncio.sleep(0.01)

ai_service = AIService()
