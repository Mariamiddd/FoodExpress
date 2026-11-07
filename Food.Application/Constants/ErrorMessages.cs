namespace Food.Application.Constants
{
    /// <summary>
    /// Centralized error messages used across the application
    /// </summary>
    public static class ErrorMessages
    {
        // Cart errors
        public const string CartItemQuantityCannotBeZero = "Quantity must be greater than 0.";
        public const string MenuItemNotFoundOrUnavailable = "Menu item not found or unavailable.";
        public const string CartItemNotFound = "Cart item not found.";
        public const string CartNotFound = "Cart not found.";

        // Order errors
        public const string OrderNotFound = "Order not found.";
        public const string MixedRestaurantError = "All items in a single order must be from the same restaurant.";
        public const string EmptyCartError = "Cannot create an order from an empty cart.";
        public const string InvalidAddressError = "The selected address does not belong to this user.";
        public const string OrderCannotBeCancelled = "Order can only be cancelled from Created or Confirmed status.";
        public const string OrderAlreadyDelivered = "Order has already been delivered and cannot be modified.";

        // Address errors
        public const string AddressNotFound = "Address not found.";
        public const string AddressDoesNotBelongToUser = "The selected address does not belong to this user.";
        public const string InvalidAddressId = "Address ID must be greater than 0.";

        // Restaurant errors
        public const string RestaurantNotFound = "Restaurant not found.";
        public const string RestaurantClosed = "This restaurant is currently closed and not accepting orders.";
        public const string RestaurantAlreadyExists = "A restaurant with this name already exists.";
        public const string InvalidRestaurantId = "Restaurant ID must be greater than 0.";

        // Menu item errors
        public const string MenuItemNameRequired = "Menu item name is required.";
        public const string MenuItemPriceInvalid = "Menu item price must be greater than 0.";
        public const string InvalidMenuItemId = "Menu Item ID must be greater than 0.";
        public const string MenuItemAlreadyExists = "A menu item with this name already exists in this restaurant.";

        // Category errors
        public const string CategoryNotFound = "Category not found.";
        public const string CategoryAlreadyExists = "A category with this name already exists.";
        public const string InvalidCategoryId = "Category ID must be greater than 0.";

        // Authentication errors
        public const string InvalidCredentials = "Invalid email or password.";
        public const string UserNotFound = "User not found.";
        public const string EmailAlreadyInUse = "This email is already registered.";
        public const string UsernameAlreadyInUse = "This username is already taken.";
        public const string UnauthorizedAccess = "You do not have permission to access this resource.";
        public const string SessionExpired = "Your session has expired. Please log in again.";

        // Generic errors
        public const string SomethingWentWrong = "An error occurred while processing your request.";
        public const string InvalidInput = "The provided input is invalid.";
        public const string OperationFailed = "The operation could not be completed.";

        // Authorization errors
        public const string AdminRoleRequired = "This action requires administrator privileges.";
        public const string OwnershipRequired = "You do not own this resource.";
    }
}
