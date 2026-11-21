# 🧪 Phase 1-4 Features - Quick Testing Guide

## Pre-Flight Checklist

✅ Dev server running: `npm run dev -- --port 3002`  
✅ No console errors  
✅ Localhost accessible  

---

## 🎯 PHASE 1: Search Filters - 5 Minutes

### Test Location
**URL:** http://localhost:3002/shopping-minimal

### Step-by-Step

1. **Filter Panel**
   - Click "🔽 Filters" button (should slide down)
   - Verify 7 categories visible
   - Check price range display (₦0 - ₦500,000)

2. **Category Filter**
   - Select "Food & Drinks"
   - See results update (food products only)
   - Change to "Electronics"
   - Verify different results

3. **Price Range**
   - Drag left slider to ₦10,000
   - Drag right slider to ₦100,000
   - See products in that range only

4. **Ratings Filter**
   - Click "4★+" button
   - See only 4-star or higher products
   - Try "5★" (5-star only)
   - Click "All" to show all

5. **Stock Filter**
   - Check "In Stock Only"
   - Should hide out-of-stock items
   - Uncheck to show all

6. **Reset**
   - Click "Reset Filters"
   - All filters should clear
   - Verify URL/state reset

7. **Persistence**
   - Apply a filter combination
   - Close browser dev tools
   - Refresh page (F5)
   - Filters should still be applied ✓

✅ **Phase 1 Complete** when all 7 steps pass

---

## 💝 PHASE 2: Wishlist - 5 Minutes

### Test Location
**URL:** http://localhost:3002/shopping-minimal (see hearts) + http://localhost:3002/wishlist

### Step-by-Step

1. **Heart Icon**
   - Scroll through products
   - Find a product you like
   - Click heart (🤍 → ❤️)
   - See toast: "Added to wishlist"

2. **Multiple Items**
   - Click heart on 3-4 products
   - Each should turn red ❤️
   - Toast confirms each time

3. **Wishlist Page**
   - Click "❤️ Wishlist" link in header
   - See all saved items in grid
   - Count should match items added
   - Check "X items saved" display

4. **Card Actions**
   - On each card in /wishlist:
     - See product image
     - See star rating
     - See price (₦)
     - See "🛒 Add to Cart" button
     - See "👁️ View" button

5. **Add to Cart**
   - Click "🛒 Add to Cart"
   - Toast: "Added to cart"
   - Item stays in wishlist

6. **Remove**
   - Click ✕ (top-right corner)
   - Toast: "Removed from wishlist"
   - Item disappears from grid

7. **Empty State**
   - Remove all wishlist items
   - See "💔 Your wishlist is empty"
   - See "Continue Shopping" button

8. **Persistence**
   - Add 2-3 items to wishlist
   - Refresh page (F5)
   - Items should still be there ✓
   - Close wishlist, reopen /wishlist
   - Items should persist ✓

9. **Mobile**
   - Test on iPhone (or mobile simulator)
   - Hearts should be easy to click
   - Wishlist grid should be 2 columns
   - All buttons should be touch-friendly

✅ **Phase 2 Complete** when all 9 steps pass

---

## ⭐ PHASE 3: Reviews - 5 Minutes

### Test Location
**URL:** http://localhost:3002/products/1/reviews

### Step-by-Step

1. **Page Load**
   - See rating summary box
   - Shows 0 stars / "0 reviews"
   - See "Write a Review" button

2. **Empty State**
   - Should show 💬 icon
   - Text: "No reviews yet"
   - Button: "Write First Review"

3. **Open Form**
   - Click "Write a Review"
   - Form expands below
   - Shows fields: Name, Rating (stars), Review text

4. **Fill Form**
   - Enter name: "John Doe"
   - Click star #4 (rate 4 stars)
   - Enter review text: "Great product! Really happy with this."
   - Click "Post Review"

5. **Review Appears**
   - Form should collapse/close
   - Toast: "Review added successfully!"
   - See review in list below:
     - Avatar (circle with "J" initial)
     - Name: "John Doe"
     - Rating: ★★★★☆
     - Date: "Today"
     - Text: "Great product! Really happy..."

6. **Rating Summary Updates**
   - Average rating should show 4.0
   - Review count: "1 reviews"
   - 4-star bar should be 100%

7. **Add More Reviews**
   - Click "Write a Review" again
   - Add 2nd review (5-star, positive)
   - Add 3rd review (3-star, mixed)

8. **Breakdown Chart**
   - Should show percentages:
     - 5★ 33%
     - 4★ 33%
     - 3★ 33%
   - Bars should update

9. **Sorting**
   - See sort dropdown
   - Default: "Most Recent"
   - Change to "Highest Rating"
   - 5-star review should move to top
   - Change to "Lowest Rating"
   - 3-star review should move to top

10. **Persistence**
    - Refresh page (F5)
    - All 3 reviews should still be there ✓
    - Average rating preserved ✓
    - Breakdown chart correct ✓

✅ **Phase 3 Complete** when all 10 steps pass

---

## 📊 PHASE 4: Seller Dashboard - 5 Minutes

### Test Location
**URL:** http://localhost:3002/seller/dashboard

### Step-by-Step

1. **Page Load**
   - See header: "📊 Seller Dashboard"
   - See 4 stat cards at top

2. **Analytics Cards**
   - Card 1: 💰 "Total Sales" (should show ₦ amount)
   - Card 2: 📦 "Orders Today" (number)
   - Card 3: ⏳ "Pending Orders" (warning color if > 0)
   - Card 4: 📈 "Total Orders" (count)

3. **Empty Dashboard**
   - If no orders: see 📭 "No orders yet" message
   - Skip to testing filter

4. **Filter Orders**
   - See "Filter by Status" dropdown
   - Options: All, Pending, Confirmed, Shipped, Delivered
   - Change filter
   - Order count should update

5. **Order Card**
   - Each order shows:
     - Order ID (shortened)
     - Date (MM/DD/YYYY)
     - Status badge (colored)
     - 2-3 items list
     - Total amount (₦)
     - Fulfillment dropdown
     - Customer email & phone
     - "View Details" button

6. **Fulfillment Status**
   - Click fulfillment dropdown
   - 5 options:
     - Pending
     - Ready for Pickup
     - Picked Up
     - In Transit
     - Delivered
   - Change status
   - Toast: "Order status updated"
   - Dropdown should reflect new state

7. **View Details Modal**
   - Click "View Details" button
   - Modal opens (dark overlay)
   - Shows full order info:
     - Order ID (full)
     - Date
     - Status badge
     - Full items table (product, qty, price, total)
     - Grand total
     - Customer email & phone
     - Fulfillment status selector

8. **Close Modal**
   - Click ✕ (top-right)
   - Modal closes
   - Overlay disappears
   - Back to order list

9. **Status Update in Modal**
   - Open modal again
   - Change fulfillment status
   - Modal closes automatically
   - Toast confirms update

10. **Mobile Responsive**
    - Test on mobile
    - Cards should stack vertically
    - Dropdown should be accessible
    - Modal should fit screen

✅ **Phase 4 Complete** when all 10 steps pass

---

## ✅ Full Test Suite Status

| Phase | Status | Tested |
|-------|--------|--------|
| 1. Search Filters | Ready | ⬜ |
| 2. Wishlist | Ready | ⬜ |
| 3. Reviews | Ready | ⬜ |
| 4. Seller Dashboard | Ready | ⬜ |

---

## 🐛 If Something Breaks

### Console Errors?
- Open DevTools (F12)
- Check Console tab
- Note exact error message
- Screenshot the full error

### localStorage Not Working?
- Open DevTools → Application → Local Storage
- Filter by "localhost:3002"
- Check keys: `webubble_filters`, `webubble_wishlist_data`, `product_reviews_*`, `seller_orders`
- Clear if needed: Right-click → Delete

### Styles Not Showing?
- Inspect element (Right-click → Inspect)
- Check if CSS classes exist (.wb-filter-toggle, etc)
- Check Network tab for CSS file loading
- Clear browser cache (Ctrl+Shift+Delete)

### Reset Everything?
```
localStorage.clear()
location.reload()
```

---

## 🎉 After All Tests Pass

1. ✅ Take screenshots of each page
2. ✅ Note any bugs or improvements
3. ✅ Commit working state
4. ✅ Push to GitHub
5. ✅ Create pull request
6. ✅ Request user acceptance testing

---

**Total Testing Time:** ~20 minutes  
**Next Step:** Backend API integration  

🚀 Ready to deploy!
