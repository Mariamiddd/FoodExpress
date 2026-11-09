using Food.Application.Services.Interfaces;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Food.Application.Services.Implementations
{
    public class ImageUploadService : IImageUploadService
    {
        private readonly string _uploadPath;
        private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        private readonly string[] _allowedMimeTypes = { "image/jpeg", "image/png", "image/gif", "image/webp" };
        private const long MaxFileSize = 5 * 1024 * 1024; // 5 MB

        public ImageUploadService(string uploadPath)
        {
            _uploadPath = uploadPath;
            if (!Directory.Exists(_uploadPath))
            {
                Directory.CreateDirectory(_uploadPath);
            }
        }

        public ValidationResult ValidateImage(Stream fileStream, string fileName, string mimeType)
        {
            if (fileStream.Length > MaxFileSize)
            {
                return new ValidationResult
                {
                    IsValid = false,
                    Message = $"File size exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)} MB"
                };
            }

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (!Array.Exists(_allowedExtensions, e => e == extension))
            {
                return new ValidationResult
                {
                    IsValid = false,
                    Message = $"File type '{extension}' is not allowed. Allowed types: {string.Join(", ", _allowedExtensions)}"
                };
            }

            if (!Array.Exists(_allowedMimeTypes, m => m == mimeType.ToLowerInvariant()))
            {
                return new ValidationResult
                {
                    IsValid = false,
                    Message = $"MIME type '{mimeType}' is not allowed"
                };
            }

            return new ValidationResult { IsValid = true, Message = "File is valid" };
        }

        public async Task<string> SaveImageAsync(Stream fileStream, string fileName, string subFolder)
        {
            try
            {
                var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
                var subFolderPath = Path.Combine(_uploadPath, subFolder);

                if (!Directory.Exists(subFolderPath))
                {
                    Directory.CreateDirectory(subFolderPath);
                }

                var filePath = Path.Combine(subFolderPath, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await fileStream.CopyToAsync(stream);
                }

                // Return web-accessible relative URL under wwwroot/uploads
                return $"/uploads/{subFolder}/{uniqueFileName}";
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to save image: {ex.Message}", ex);
            }
        }

        public void DeleteImage(string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
                return;

            try
            {
                var cleanPath = relativePath.TrimStart('/', '\\');
                if (cleanPath.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase) ||
                    cleanPath.StartsWith("uploads\\", StringComparison.OrdinalIgnoreCase))
                {
                    cleanPath = cleanPath.Substring("uploads/".Length);
                }

                var fullPath = Path.Combine(_uploadPath, cleanPath);
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: Failed to delete image {relativePath}: {ex.Message}");
            }
        }
    }
}