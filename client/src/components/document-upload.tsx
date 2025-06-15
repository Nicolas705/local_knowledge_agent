import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { CloudUpload, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import type { UploadProgress } from "@/lib/types";

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/documents/upload', formData);
      return response.json();
    },
    onSuccess: () => {
      onUploadComplete();
      toast({
        title: "Document uploaded",
        description: "Document has been processed and indexed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const processFile = useCallback(async (file: File) => {
    const uploadId = Date.now() + Math.random();
    
    // Add to upload queue
    const uploadProgress: UploadProgress = {
      file,
      progress: 0,
      status: 'uploading'
    };
    
    setUploadQueue(prev => [...prev, uploadProgress]);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadQueue(prev => 
          prev.map(item => 
            item.file === file && item.status === 'uploading'
              ? { ...item, progress: Math.min(item.progress + 10, 90) }
              : item
          )
        );
      }, 200);

      // Upload file
      await uploadMutation.mutateAsync(file);
      
      clearInterval(progressInterval);
      
      // Mark as complete
      setUploadQueue(prev => 
        prev.map(item => 
          item.file === file 
            ? { ...item, progress: 100, status: 'complete' }
            : item
        )
      );

      // Remove from queue after delay
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.file !== file));
      }, 2000);

    } catch (error) {
      // Mark as error
      setUploadQueue(prev => 
        prev.map(item => 
          item.file === file 
            ? { ...item, status: 'error', error: error.message }
            : item
        )
      );
    }
  }, [uploadMutation, toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(processFile);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFromQueue = (file: File) => {
    setUploadQueue(prev => prev.filter(item => item.file !== file));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-blue-50' 
            : 'border-slate-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <CloudUpload className="mx-auto h-8 w-8 text-slate-400 mb-3" />
        <p className="text-sm font-medium text-slate-900 mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-slate-500">
          Supports .txt, .md, .pdf files up to 50MB
        </p>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2">
          {uploadQueue.map((item, index) => (
            <div key={index} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {item.status === 'complete' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  {(item.status === 'uploading' || item.status === 'processing') && (
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {item.file.name}
                  </span>
                </div>
                
                <button
                  onClick={() => removeFromQueue(item.file)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {item.status === 'uploading' && (
                <div className="space-y-1">
                  <Progress value={item.progress} className="h-1" />
                  <p className="text-xs text-slate-500">
                    {item.progress < 90 ? 'Uploading...' : 'Processing...'}
                  </p>
                </div>
              )}

              {item.status === 'error' && (
                <p className="text-xs text-red-600">{item.error}</p>
              )}

              {item.status === 'complete' && (
                <p className="text-xs text-green-600">Upload complete</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
