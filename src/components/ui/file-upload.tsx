/**
 * 文件上传组件 - 移植自GUI项目的文件上传功能
 */
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image } from 'lucide-react';
import { cn, formatFileSize, validateImageFile, validateCSVFile } from '@/lib/utils';
import { Button } from './button';

export interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  accept?: 'image' | 'csv' | 'all';
  multiple?: boolean;
  maxSize?: number; // bytes
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFilesChange,
  accept = 'all',
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  className,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const validateFile = useCallback((file: File): string | null => {
    // 检查文件大小
    if (file.size > maxSize) {
      return `文件 "${file.name}" 超过最大大小限制 ${formatFileSize(maxSize)}`;
    }

    // 检查文件类型
    if (accept === 'image' && !validateImageFile(file)) {
      return `文件 "${file.name}" 不是有效的图片格式`;
    }

    if (accept === 'csv' && !validateCSVFile(file)) {
      return `文件 "${file.name}" 不是有效的CSV格式`;
    }

    return null;
  }, [accept, maxSize]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    // 处理被拒绝的文件
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          newErrors.push(`文件 "${file.name}" 超过最大大小限制`);
        } else if (error.code === 'file-invalid-type') {
          newErrors.push(`文件 "${file.name}" 格式不支持`);
        } else {
          newErrors.push(`文件 "${file.name}" 上传失败: ${error.message}`);
        }
      });
    });

    // 验证接受的文件
    acceptedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    // 检查文件数量限制
    const totalFiles = multiple ? files.length + validFiles.length : validFiles.length;
    if (totalFiles > maxFiles) {
      newErrors.push(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    setErrors(newErrors);

    if (validFiles.length > 0) {
      const newFiles = multiple ? [...files, ...validFiles] : validFiles;
      setFiles(newFiles);
      onFilesChange(newFiles);
    }
  }, [files, multiple, maxFiles, validateFile, onFilesChange]);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles);
    setErrors([]);
  }, [files, onFilesChange]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    onFilesChange([]);
    setErrors([]);
  }, [onFilesChange]);

  const getAcceptedFileTypes = (): Record<string, string[]> | undefined => {
    switch (accept) {
      case 'image':
        return {
          'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        };
      case 'csv':
        return {
          'text/csv': ['.csv']
        };
      default:
        return undefined;
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptedFileTypes(),
    multiple,
    maxSize,
    disabled,
  });

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 拖拽上传区域 */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? '释放文件到这里' : '拖拽文件到这里，或点击选择文件'}
        </p>
        <p className="text-sm text-gray-500">
          {accept === 'image' && '支持 JPG、PNG、GIF、WebP 格式'}
          {accept === 'csv' && '支持 CSV 格式'}
          {accept === 'all' && '支持所有文件格式'}
          {maxSize && ` • 最大 ${formatFileSize(maxSize)}`}
          {multiple && ` • 最多 ${maxFiles} 个文件`}
        </p>
      </div>

      {/* 错误信息 */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              已选择文件 ({files.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFiles}
              className="text-red-600 hover:text-red-700"
            >
              清空所有
            </Button>
          </div>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
