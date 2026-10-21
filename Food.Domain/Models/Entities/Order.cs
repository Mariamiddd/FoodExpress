using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public class Order
    {

        public int Id { get; set; }
        public int UserId { get; set; }
        public int RestaurantId { get; set; }
        public int AddressId { get; set; }

        public User User { get; set; }
        public Restaurant Restaurant { get; set; }
        public Address Address { get; set; }

        public DateTime CreatedAt { get; set; }
        public decimal TotalPrice { get; set; }
        public OrderState Status { get; private set; }

        public List<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

        public void Confirm()
        {
            if (Status == OrderState.Created) Status = OrderState.Confirmed;
            else throw new InvalidOperationException("Order can only be confirmed from Created status.");
        }

        public void Cancel()
        {
            if (Status == OrderState.Created || Status == OrderState.Confirmed) Status = OrderState.Cancelled;
            else throw new InvalidOperationException("Order can only be cancelled from Created or Confirmed status.");
        }

        public void StartPreparing()
        {
            if (Status == OrderState.Confirmed) Status = OrderState.Preparing;
            else throw new InvalidOperationException("Order can only be prepared from Confirmed status.");
        }

        public void SendForDelivery()
        {
            if (Status == OrderState.Preparing) Status = OrderState.OnTheWay;
            else throw new InvalidOperationException("Order can only be sent for delivery from Preparing status.");
        }

        public void MarkAsDelivered()
        {
            if (Status == OrderState.OnTheWay) Status = OrderState.Delivered;
            else throw new InvalidOperationException("Order can only be marked as delivered from OnTheWay status.");
        }
    }
}