using Food.Web.Repsonses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace Food.Web.Middleware
{
    public class ExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlerMiddleware> _logger;

        public ExceptionHandlerMiddleware(RequestDelegate next, ILogger<ExceptionHandlerMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var (statusCode, title) = exception switch
            {
                KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found"),
                ArgumentException => (StatusCodes.Status400BadRequest, "Invalid Argument"),
                InvalidOperationException => (StatusCodes.Status400BadRequest, "Business Rule Violation"),
                UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Access Denied"),
                _ => (StatusCodes.Status500InternalServerError, "Internal Server Error")
            };

            if (statusCode == StatusCodes.Status500InternalServerError)
                _logger.LogError(exception, "Unhandled exception occurred on {Method} {Path}", context.Request.Method, context.Request.Path);
            else
                _logger.LogWarning("Handled domain exception ({StatusCode}): {Message}", statusCode, exception.Message);

            var detailMessage = statusCode == StatusCodes.Status500InternalServerError
                ? "An unexpected error occurred while processing your request."
                : exception.Message;

            // Standard RFC 7807 ProblemDetails + ApiResponse compatibility fields for the frontend
            var problemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detailMessage,
                Instance = context.Request.Path
            };

            problemDetails.Extensions["success"] = false;
            problemDetails.Extensions["message"] = detailMessage;
            problemDetails.Extensions["data"] = null;
            problemDetails.Extensions["errors"] = null;

            context.Response.ContentType = "application/problem+json";
            context.Response.StatusCode = statusCode;

            await context.Response.WriteAsJsonAsync(problemDetails);
        }
    }
}