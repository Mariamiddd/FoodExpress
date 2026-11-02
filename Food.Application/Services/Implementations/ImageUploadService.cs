using System;
using System.IO;
using System.Threading.Tasks;

namespace Food.Application.Services.Implementations
{
    public class ImageUploadService
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

        /// <summary>
        /// Validates an image file
        /// </summary>
        public ValidationResult ValidateImage(Stream fileStream, string fileName, string mimeType)
        {
            // Check file size
            if (fileStream.Length > MaxFileSize)
            {
                return new ValidationResult 
                { 
                    IsValid = false, 
                    Message = $"File size exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)} MB" 
                };
            }

            // Check file extension
            var extension = Path.GetExtension(fileName).ToLower();
            if (!Array.Exists(_allowedExtensions, e => e == extension))
            {
                return new ValidationResult 
                { 
                    IsValid = false, 
                    Message = $"File type '{extension}' is not allowed. Allowed types: {string.Join(", ", _allowedExtensions)}" 
                };
            }

            // Check MIME type
            if (!Array.Exists(_allowedMimeTypes, m => m == mimeType))
            {
                return new ValidationResult 
                { 
                    IsValid = false, 
                    Message = $"MIME type '{mimeType}' is not allowed" 
                };
            }

            return new ValidationResult { IsValid = true, Message = "File is valid" };
        }

        /// <summary>
        /// Saves an image file and returns the relative path
        /// </summary>
        public async Task<string> SaveImageAsync(Stream fileStream, string fileName, string subFolder)
        {
            try
            {
                // Create unique filename to avoid conflicts
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

                // Return relative path for storage in database
                return Path.Combine(subFolder, uniqueFileName).Replace("\\", "/");
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to save image: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Deletes an image file
        /// </summary>
        public void DeleteImage(string relativePath)
        {
            if (string.IsNullOrEmpty(relativePath))
                return;

            try
            {
                var fullPath = Path.Combine(_uploadPath, relativePath);
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }
            }
            catch (Exception ex)
            {
                // Log but don't throw - deletion failure shouldn't break the operation
                Console.WriteLine($"Warning: Failed to delete image {relativePath}: {ex.Message}");
            }
        }
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; }
    }
}
