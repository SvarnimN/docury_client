"use client";
import { useState, useCallback, useRef, useEffect, ChangeEvent } from "react";
import AttachFileIcon from "@mui/icons-material/AttachFile"; 
import SendIcon from "@mui/icons-material/Send";          
import ClearIcon from "@mui/icons-material/Clear";
import FilePresentIcon from "@mui/icons-material/FilePresent";

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
    content: "Hello! I am Docury. You can ask me questions about the document you upload. Use the Attach File button to begin.", 
    id: "welcome-message" 
  }
];

const ChatPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<any[]>(initialMessages); 
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); 

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ButtonActionClass = `active:scale-[0.95]
    transition-transform
    duration-100
    ease-out
    flex
    items-center
    justify-center
  `;

  const handleUpload = useCallback(async (selectedFile: File) => {
    if (isUploading) return;
    setIsUploading(true);
    setFile(selectedFile);
    setUploadedFileName(selectedFile.name);
    setMessages((m) => [
      ...m,
      { type: "system", content: `Uploading file: ${selectedFile.name}...` },
    ]);

    const form = new FormData();
    form.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();

      console.log(json);
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
  }, [isUploading]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMessages((m) => [
      ...m,
      {
        type: "system",
        content: `File context removed. Chat session continues without RAG context.`,
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isUploading || isLoading) return;

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      sendMessage();
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

  return (
    <div
      className={`h-screen ${baseClasses.background} ${baseClasses.text} ${baseClasses.font} p-4 md:p-8`}
    >
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <header className="py-4 mb-4 border-b border-indigo-200">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-600">
            Docury <span className="text-lg font-light text-gray-500">| Know your docs</span>
          </h1>
        </header>

        <div
          ref={chatContainerRef}
          className={`flex-grow overflow-y-auto p-8 md:p-10 rounded-xl mb-4 bg-white ${baseClasses.shadow} border ${baseClasses.border}`}
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

        <div
          className={`flex flex-col py-4 px-6 bg-white rounded-xl shadow-2xl border border-indigo-100`}
        >
          {uploadedFileName && (
            <div className="flex items-center text-base mb-3 text-indigo-700 font-semibold">
              <FilePresentIcon className="text-indigo-600 mr-2" style={{ fontSize: 20 }} /> 
              <span>
                Context File: **{uploadedFileName}**
              </span>
              <button
                onClick={handleRemoveFile}
                className={`ml-4 text-red-500 hover:text-red-700 transition ${ButtonActionClass}`}
                aria-label="Remove uploaded file"
              >
                <ClearIcon style={{ fontSize: 20 }} /> 
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              className={`flex-1 py-3 px-4 rounded-full bg-white text-gray-800 placeholder-gray-500 border ${baseClasses.border} focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 focus:outline-none transition-all duration-200 text-md shadow-inner`}
              placeholder={
                isUploading
                  ? "Processing file..."
                  : isLoading
                  ? "Waiting for response..."
                  : "Ask your question..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isUploading || isLoading}
            />
            <button
              onClick={sendMessage}
              className={`p-4 rounded-full transition duration-300 ease-in-out shadow-lg ${
                !input.trim() || isUploading || isLoading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                  : baseClasses.primary
              } ${ButtonActionClass}`}
              disabled={!input.trim() || isUploading || isLoading}
              aria-label="Send Message"
            >
              <SendIcon style={{ fontSize: 18 }} />
            </button>
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading || !!uploadedFileName || isLoading}
              />
              <button
                className={`p-4 rounded-full transition duration-300 ease-in-out ${
                  isUploading || !!uploadedFileName || isLoading
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                } shadow-lg ${ButtonActionClass}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !!uploadedFileName || isLoading}
                aria-label="Attach File"
              >
                <AttachFileIcon style={{ fontSize: 18 }} /> 
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
