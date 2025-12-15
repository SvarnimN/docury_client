"use client";
import { useState, useCallback, useRef, useEffect, ChangeEvent } from "react";
import AttachFileIcon from "@mui/icons-material/AttachFile"; 
import SendIcon from "@mui/icons-material/Send";          
import ClearIcon from "@mui/icons-material/Clear";
import FilePresentIcon from "@mui/icons-material/FilePresent";
import LinkIcon from "@mui/icons-material/Link";
import PublicIcon from "@mui/icons-material/Public";

const baseClasses = {
  font: "font-sans",
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white transition duration-200 ease-in-out", 
  ai: "bg-gray-100 text-gray-800",
  user: "bg-indigo-500 text-white",
  border: "border-gray-200",
  background: "bg-gray-100",
  text: "text-gray-800",
  shadow: "shadow-xl",
};

const initialMessages = [
  { 
    type: "ai", 
    content: "Hello! I am Docury. You can ask me questions about the document or URL you provide. Use the controls on the left to begin.", 
    id: "welcome-message" 
  }
];

const ButtonActionClass = `active:scale-[0.95]
    transition-transform
    duration-100
    ease-out
    flex
    items-center
    justify-center
    shadow-lg
`;

const ChatPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<any[]>(initialMessages); 
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); 
  
  const [urlInput, setUrlInput] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedUrl, setIndexedUrl] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim() || isIndexing || isUploading || indexedUrl || uploadedFileName) return;

    const urlToCrawl = urlInput.trim();
    setIsIndexing(true);
    setMessages((m) => [
      ...m,
      { type: "system", content: `Indexing URL: ${urlToCrawl}...` },
    ]);
    
    try {
      const res = await fetch("/api/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToCrawl, sessionId }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      await res.json();

      setIndexedUrl(urlToCrawl);
      setMessages((m) => [
        ...m,
        {
          type: "system",
          content: `URL "${urlToCrawl}" successfully indexed and ready for RAG.`,
        },
      ]);
      setUrlInput("");
    } catch (error) {
      console.error("Indexing error:", error);
      setMessages((m) => [
        ...m,
        {
          type: "system",
          content: `Error indexing URL "${urlToCrawl}". Please check the URL and try again.`,
          error: true,
        },
      ]);
      setIndexedUrl(null);
    } finally {
      setIsIndexing(false);
    }
  }, [urlInput, isIndexing, isUploading, indexedUrl, uploadedFileName, sessionId]);

  const handleUpload = useCallback(async (selectedFile: File) => {
    if (isUploading || isIndexing || indexedUrl) return; 
    setIsUploading(true);
    setFile(selectedFile);
    setUploadedFileName(selectedFile.name);
    
    setIndexedUrl(null); 
    
    setMessages((m) => [
      ...m,
      { type: "system", content: `Uploading file: ${selectedFile.name}...` },
    ]);

    const form = new FormData();
    form.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      await res.json();

      setMessages((m) => [
        ...m,
        {
          type: "system",
          content: `File "${selectedFile.name}" successfully processed and ready for RAG.`,
        },
      ]);
    } catch (error) {
      console.error("Upload error:", error);
      setMessages((m) => [
        ...m,
        {
          type: "system",
          content: `Error processing file "${selectedFile.name}". Please try again.`,
          error: true,
        },
      ]);
      setUploadedFileName(null);
      setFile(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isUploading, isIndexing, indexedUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const handleRemoveContext = () => {
    setFile(null);
    setUploadedFileName(null);
    setIndexedUrl(null);
    setUrlInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMessages((m) => [
      ...m,
      {
        type: "system",
        content: `RAG context removed. Chat session continues without specific context.`,
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isUploading || isLoading || isIndexing) return;

    const userMessage = input.trim();
    
    setMessages((m) => [...m, { type: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    const aiPlaceholderId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { type: "ai", content: "...", id: aiPlaceholderId, isLoading: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          hasContext: !!uploadedFileName || !!indexedUrl
        }),
      });

      if (!res.ok) throw new Error("API call failed");

      const data = await res.json();
      const answer = data?.response || "No response received.";

      setMessages((m) =>
        m.map((msg) =>
          msg.id === aiPlaceholderId
            ? { ...msg, content: answer, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      console.error("Send message error:", error);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === aiPlaceholderId
            ? {
                ...msg,
                content: "Sorry, an error occurred while fetching the response.",
                isLoading: false,
                error: true
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && urlInput.trim()) {
      handleUrlSubmit();
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const isContextSet = !!uploadedFileName || !!indexedUrl;
  const isActionDisabled = isUploading || isLoading || isIndexing;
  const isFileOrUrlSet = !!uploadedFileName || !!indexedUrl;

  return (
    <div
      className={`h-screen ${baseClasses.background} ${baseClasses.text} ${baseClasses.font} p-4 md:p-8`}
    >
      <header className="py-4 mb-4 border-b border-indigo-200 max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-600">
          Docury
        </h1>
      </header>
      
      <div className="max-w-7xl mx-auto h-[calc(100%-80px)] grid grid-cols-12 gap-6">
        
        <aside className="col-span-12 md:col-span-3 flex flex-col space-y-4">
          <div className={`p-5 bg-white rounded-xl ${baseClasses.shadow} border ${baseClasses.border} flex flex-col space-y-4`}>
            {isContextSet && (
              <div className="flex items-center text-sm p-3 bg-indigo-50 border border-indigo-200 rounded-lg font-medium">
                {uploadedFileName && (
                  <>
                    <FilePresentIcon className="text-indigo-600 mr-2" style={{ fontSize: 20 }} /> 
                    <span className="truncate">
                      File: **{uploadedFileName}**
                    </span>
                  </>
                )}
                {indexedUrl && (
                  <>
                    <PublicIcon className="text-indigo-600 mr-2" style={{ fontSize: 20 }} /> 
                    <span className="truncate">
                      URL: {indexedUrl}
                    </span>
                  </>
                )}
                <button
                  onClick={handleRemoveContext}
                  className={`ml-4 text-red-500 hover:text-red-700 transition ${ButtonActionClass} p-1 rounded-full`}
                  aria-label="Remove RAG context"
                >
                  <ClearIcon style={{ fontSize: 18 }} /> 
                </button>
              </div>
            )}
            <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100">
                <label className="text-sm font-semibold text-gray-700">
                    URL to index
                </label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        className={`flex-1 py-2 px-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border ${baseClasses.border} focus:ring-1 focus:ring-indigo-300 focus:border-indigo-500 focus:outline-none transition-all duration-200 text-sm shadow-inner`}
                        placeholder="e.g., https://example.com"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={handleUrlKeyDown}
                        disabled={isActionDisabled || isFileOrUrlSet}
                    />
                    <button
                        onClick={handleUrlSubmit}
                        className={`p-3 rounded-lg ${
                            urlInput.trim() && !isActionDisabled && !isFileOrUrlSet
                                ? baseClasses.primary
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        } ${ButtonActionClass}`}
                        disabled={!urlInput.trim() || isActionDisabled || isFileOrUrlSet}
                        aria-label="Index URL"
                    >
                        {isIndexing ? (
                            <div className="w-4 h-4 border-2 border-t-2 border-t-white border-gray-400 rounded-full animate-spin"></div>
                        ) : (
                            <LinkIcon style={{ fontSize: 18 }} />
                        )}
                    </button>
                </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Upload a document
                </label>
                <div className="relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isActionDisabled || isFileOrUrlSet}
                    />
                    <button
                        className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-300 ease-in-out ${
                            isActionDisabled || isFileOrUrlSet
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                                : baseClasses.primary
                        } ${ButtonActionClass}`}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isActionDisabled || isFileOrUrlSet}
                        aria-label="Attach File"
                    >
                        {isUploading ? "Processing..." : "Attach Document"}
                        <AttachFileIcon className="ml-2" style={{ fontSize: 18 }} /> 
                    </button>
                </div>
            </div>

            <p className="text-xs text-gray-500 text-center pt-2">
                *Only one context source (File or URL) can be provided at a time.
            </p>
              <div className="pt-4 mt-4 border-t border-gray-200">
                <h2 className="text-lg font-bold text-indigo-700 border-b pb-2 mb-2">Ask Docury</h2>
                
                <div className="flex flex-col gap-3">
                    <textarea
                        rows={4}
                        className={`w-full py-3 px-4 rounded-xl bg-white text-gray-800 placeholder-gray-500 border ${baseClasses.border} focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 focus:outline-none transition-all duration-200 text-md shadow-inner resize-none`}
                        placeholder={
                            isActionDisabled
                            ? (isUploading ? "Processing file..." : isIndexing ? "Indexing URL..." : "Waiting for response...")
                            : "Ask your question (Shift+Enter for new line, Enter to send)..."
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isActionDisabled}
                    />
                    
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={sendMessage}
                            className={`px-4 py-3 rounded-lg transition duration-300 ease-in-out ${
                                !input.trim() || isActionDisabled
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                                : baseClasses.primary
                            } ${ButtonActionClass}`}
                            disabled={!input.trim() || isActionDisabled}
                            aria-label="Send Message"
                        >
                            Send <SendIcon className="ml-2" style={{ fontSize: 18 }} />
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </aside>
        <main
          className="col-span-12 md:col-span-9 h-full flex flex-col"
        >
          <div
            ref={chatContainerRef}
            className={`flex-grow overflow-y-auto p-6 md:p-8 rounded-xl bg-white ${baseClasses.shadow} border ${baseClasses.border}`}
          >
            <div className="space-y-4"> 
              {messages.map((msg, i) => {
                const isUser = msg.type === "user";
                const isSystem = msg.type === "system";
                
                let bgColor = baseClasses.ai;
                let textColor = baseClasses.text;
                let shadow = "shadow-sm";
                
                if (isUser) {
                    bgColor = baseClasses.user;
                    textColor = "text-white";
                    shadow = "shadow-md";
                } else if (isSystem) {
                    bgColor = msg.error ? "bg-red-100" : "bg-green-50"; 
                    textColor = msg.error ? "text-red-700" : "text-green-700";
                    shadow = "shadow-sm";
                }

                const messagePadding = 'p-3'; 
                const borderRadius = isUser 
                  ? "rounded-tr-md rounded-b-lg rounded-tl-lg"
                  : "rounded-tl-md rounded-b-lg rounded-tr-lg";

                const isAiLoadingPlaceholder = msg.type === "ai" && msg.isLoading;

                return (
                  <div
                    key={msg.id || i}
                    className={`flex ${isUser || isSystem ? "justify-end" : "justify-start"} mb-4`} 
                  >
                    <div
                      className={`${messagePadding} max-w-3xl ${shadow} transition duration-300 ease-in-out ${bgColor} ${textColor} ${borderRadius} ${isSystem ? 'border border-gray-200 italic text-sm' : 'text-base'}`}
                    >
                      {isAiLoadingPlaceholder ? (
                           <div className="flex items-center space-x-2">
                               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-0"></div>
                               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-100"></div>
                               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-200"></div>
                          </div>
                      ) : (
                          msg.content
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatPage;
