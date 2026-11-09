using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Interfaces
{
    public interface IImageUploadService
    {
        ValidationResult ValidateImage(Stream fileStream, string fileName, string mimeType);
        Task<string> SaveImageAsync(Stream fileStream, string fileName, string subFolder);
        void DeleteImage(string relativePath);
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}