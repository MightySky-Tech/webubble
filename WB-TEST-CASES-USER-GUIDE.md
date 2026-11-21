# 🧪 Test Case Management Page - User Guide

**Version:** 1.0  
**Created:** November 15, 2026  
**Status:** Live & Ready for Client Testing

---

## Overview

The Test Case Management Page is an **interactive, web-based testing platform** that allows clients to systematically test Webubble features, record pass/fail results, and provide feedback—all in real-time, with no external tools needed.

### Why This Matters
- ✅ **Transparent Testing** - Client sees exactly what's being tested
- ✅ **Real-time Feedback** - Comments captured immediately  
- ✅ **Centralized Records** - All test data in one place
- ✅ **Actionable Insights** - Team can review feedback and prioritize fixes
- ✅ **Professional** - Demonstrates quality processes to client

---

## 🎯 Quick Start

### For the Client (Tester)

1. **Open the test page**
   ```
   https://sn5j7r6b-3000.eun1.devtunnels.ms/test-cases
   ```

2. **View dashboard**
   - See total tests: 12
   - See current progress (0% → 100%)
   - All tests start as "Pending ⏳"

3. **Pick a test**
   - Click the ▶ arrow next to any test
   - Test expands to show full details

4. **Run the test**
   - Follow the "Steps to Test" in the application
   - Compare results to "Expected Result"

5. **Mark the result**
   - Click ✅ **Mark as Pass** (everything works as expected)
   - Click ❌ **Mark as Fail** (something is wrong)
   - Timestamp is auto-recorded

6. **Add feedback** (if needed)
   - Click in "Comments & Issues" box
   - Type what you found
   - Save automatically

7. **Continue**
   - Move to next test
   - Progress bar updates automatically
   - Can view only Failed tests to see issues

8. **Export when done**
   - Click "Download JSON Report" or "Download CSV Report"
   - Send to development team

---

## 📋 Test Cases Included

### WB-014: Shopping Cart Features

| Test ID | Test Name | What to Check | Why It Matters |
|---------|-----------|---------------|----------------|
| TC-001 | Homepage Loads | Can you see products and categories? | User entry point |
| TC-002 | Add Product to Cart | Does "Add to Cart" button work? | Core shopping feature |
| TC-003 | Cart Quantity Adjustment | Can you change quantity +/- buttons? | User control |
| TC-004 | Remove Item from Cart | Can you remove items? | Undo functionality |
| TC-005 | Cart Persistence | Does cart survive page refresh? | Data integrity |

### WB-015: Checkout Features

| Test ID | Test Name | What to Check | Why It Matters |
|---------|-----------|---------------|----------------|
| TC-006 | Checkout Step 1 - Shipping Address | Form validation and data capture | Order delivery |
| TC-007 | Checkout Step 2 - Payment Selection | Payment method choice works | Payment processing |
| TC-008 | Checkout Step 3 - Review Order | Order summary is accurate | Fraud prevention |
| TC-009 | Checkout Step 4 - Order Confirmation | Order created successfully | Transaction success |
| TC-010 | Form Validation - Phone Number | Invalid phone shows error | Data validation |

### General Features

| Test ID | Test Name | What to Check | Why It Matters |
|---------|-----------|---------------|----------------|
| TC-011 | Mobile Responsiveness | Does layout work on phones (375px)? | Mobile users |
| TC-012 | Empty Cart Message | Does empty cart show helpful message? | UX clarity |

---

## 🎛️ Dashboard Features

### Statistics Cards
- **Total Tests**: 12 (all tests for this feature set)
- **Passed ✅**: Number of tests marked as Pass
- **Failed ❌**: Number of tests marked as Fail  
- **Pending ⏳**: Number of tests not yet run
- **% Passed**: Progress bar showing pass percentage

### Filter Buttons
- **📋 All** - Show all 12 tests
- **⏳ Pending** - Show only tests not yet run
- **✅ Passed** - Show only successful tests
- **❌ Failed** - Show only tests with issues

---

## 📝 Test Case Details

When you click ▶ to expand a test, you'll see:

### Description
Brief explanation of what this test is checking and why it matters.

### Steps to Test
Numbered list of actions to perform. Follow these in order in the live application.

Example:
```
1. Navigate to homepage
2. Click on any product
3. Click "Add to Cart" button
4. Navigate to /cart
5. Verify product appears in cart
```

### Expected Result
What should happen if the feature is working correctly.

Example:
```
Product appears in cart with correct name, price, and quantity selector.
Quantity can be adjusted with +/- buttons.
```

### Test Result Buttons

Click one of three buttons to record the result:

- **✅ Mark as Pass** - Click if test passed (feature works as expected)
- **❌ Mark as Fail** - Click if test failed (something is wrong)
- **⏳ Reset** - Click to clear the result and start over

**Note:** Clicking Pass or Fail automatically timestamps when the test was run.

### Comments & Issues

Large text box where you can type:
- ✍️ Bugs you found
- 🎨 UX improvements
- 🐛 Unusual behavior
- ❓ Questions about features
- 📝 Any other observations

Example comment:
```
The cart total doesn't update when I change quantity using the minus button.
It works fine with the plus button. This happens on my iPhone 12 running iOS 17.
```

### Tested At
Timestamp showing when you marked the test as Pass or Fail.

Example: `Tested at: 11/15/2026, 3:45:30 PM`

---

## 💾 Data Storage

### How It Works
- All your test results are saved in your browser's **localStorage**
- No data leaves your browser unless you export
- Data persists even if you close the browser
- Works without a server or database

### What Gets Saved
- Test status (Pending / Pass / Fail)
- Your comments and feedback
- Timestamp of when you marked results
- All filter preferences

### Privacy
- Only you can see your data (it's in your browser)
- No server logging of test results
- No analytics or tracking
- Complete data privacy

---

## 📊 Exporting Results

When you're done testing, scroll to the bottom to find three buttons:

### 📥 Download JSON Report
- Exports complete test data as JSON
- Includes all comments and timestamps
- Full technical detail
- Use for: Detailed technical analysis

**Format:**
```json
{
  "id": "TC-001",
  "name": "Homepage Loads",
  "status": "pass",
  "comments": "Homepage loaded quickly and all categories visible",
  "testedAt": "11/15/2026, 2:30:15 PM"
}
```

### 📊 Download CSV Report
- Exports data as Excel/Sheets-friendly CSV
- Easy to import into spreadsheets
- Simplified format (one row per test)
- Use for: Sharing with non-technical stakeholders

**Format:**
```
Test ID,Name,Status,Comments,Tested At
TC-001,Homepage Loads,PASS,"Homepage loaded quickly",11/15/2026 2:30 PM
TC-002,Add Product to Cart,FAIL,"Add to Cart button not visible",11/15/2026 2:35 PM
```

### 🔄 Reset All
- Clears all test results and starts fresh
- Removes all comments
- Returns all tests to "Pending ⏳"
- Use for: Starting a new test cycle

**Warning:** This action cannot be undone. Export your report first if you want to keep the data.

---

## 🔍 How to Use Filters

### View by Status

**All Tests (12)**
- Shows every test regardless of status
- Good for: Seeing everything at once

**Pending Tests (12)** ← Default when you start
- Shows only tests you haven't run yet
- Good for: Planning your testing session

**Passed Tests (0)**
- Shows only tests marked ✅ Pass
- Good for: Confirming what works

**Failed Tests (0)**
- Shows only tests marked ❌ Fail
- Good for: Seeing what needs fixing

### Filter Example

**Scenario:** You've tested 8 tests and found 2 bugs. You want to focus on bugs.
1. Click "❌ Failed (2)" button
2. Only the 2 failed tests show
3. Review comments on each
4. Share this filtered view with developers

---

## 🧪 Testing Tips

### For Effective Testing

1. **Read the description first**
   - Understand what you're testing
   - Don't make assumptions

2. **Follow the steps exactly**
   - Don't skip steps
   - Do them in order
   - Test one thing at a time

3. **Compare to expected result**
   - Check if actual result matches expected
   - Minor differences might still be OK
   - Major differences = probably a bug

4. **Be specific in comments**
   ✅ Good: "Cart doesn't update when I click the minus button on iPhone 12"
   ❌ Bad: "It doesn't work"

5. **Note your environment**
   - Browser: Chrome, Safari, Firefox?
   - Device: Phone, tablet, desktop?
   - OS: iOS, Android, Windows, Mac?

6. **Test on different devices**
   - Phone (narrow screen)
   - Tablet (medium screen)  
   - Desktop (wide screen)
   - Different browsers

### If Something Fails

**Step 1: Try again**
- Refresh the page (F5)
- Clear your browser cache (if needed)
- Try on a different device/browser

**Step 2: Note the failure**
- Mark as Fail ❌
- Add detailed comments
- Include browser/device info
- Include steps to reproduce

**Step 3: Screenshot (optional)**
- Take a screenshot of the problem
- Save it locally
- Can attach to bug report later

---

## 🎓 Example: Testing TC-002 "Add Product to Cart"

### Test Case Details (from page)
```
TC-002: Add Product to Cart

Description:
Test adding a single product to shopping cart

Steps to Test:
1. Browse to any product
2. Click "Add to Cart" button
3. Navigate to /cart
4. Verify product appears in cart

Expected Result:
Product appears in cart with correct name, price, and quantity selector
```

### How You Would Test It

**Step 1: Navigate to homepage**
- Go to https://sn5j7r6b-3000.eun1.devtunnels.ms/
- Wait for page to load

**Step 2: Browse to any product**
- Scroll down to see products
- Click on any product card
- Product detail page opens

**Step 3: Click "Add to Cart" button**
- Look for "Add to Cart" button (should be green)
- Click it
- Button might change to "Added!" or similar

**Step 4: Navigate to /cart**
- Click cart icon in header
- Or go to https://sn5j7r6b-3000.eun1.devtunnels.ms/cart

**Step 5: Verify product appears**
- You should see the product you added
- Product name should be correct
- Price should match what you saw
- Quantity selector should be visible (should show 1)

### Recording Your Result

**If test passed (everything works):**
1. Come back to test case page (in another tab)
2. Click ✅ "Mark as Pass"
3. Add comment (optional): "Added product to cart successfully, quantity selector works"

**If test failed (something didn't work):**
1. Come back to test case page (in another tab)
2. Click ❌ "Mark as Fail"
3. Add comment with details: "Add to Cart button exists but clicking it does nothing. Tried on iPhone 12 with Safari."

---

## ❓ FAQ

### Q: What if I test on a feature but it fails? Is the app broken?
**A:** Not necessarily! It could be:
- Browser issue (try different browser)
- Network issue (check connection)
- Cache issue (clear browser cache)
- Actual bug (mark as Fail with details)

Report it anyway with as much detail as possible. Developers can investigate.

### Q: Can I test on mobile?
**A:** Yes! Open the same URL on your phone:
```
https://sn5j7r6b-3000.eun1.devtunnels.ms/test-cases
```
The page is mobile-responsive, so you can run tests and mark results on your phone.

### Q: What if I accidentally click "Reset All"?
**A:** Your results are gone. **Always export first** if you want to keep data.

**Prevention:** Export your report to CSV/JSON regularly so you have backups.

### Q: Can I test the same feature twice?
**A:** Yes! Click ⏳ "Reset" button on the test to clear it, then test again.

### Q: Who sees my comments?
**A:** Only people with access to this application see your comments. They're stored locally in your browser and only exported when you download the report.

### Q: How long does testing take?
**A:** About 5-10 minutes per test:
- 1-2 min: Read and understand test
- 2-5 min: Perform steps in application
- 1-2 min: Mark result and add comments
- 12 tests = ~60-120 minutes total (2 hours)

### Q: What's a "pass percentage"?
**A:** Shows what % of tests you've marked as Pass.
- 0% = No tests passed yet
- 50% = Half your tests passed
- 100% = All tests passed! 🎉

---

## 🚀 Best Practices

### Before You Start Testing
- ✅ Read all test case descriptions
- ✅ Understand what you're testing
- ✅ Have the application in another tab/window
- ✅ Set aside uninterrupted time

### During Testing
- ✅ Follow steps exactly as written
- ✅ Take notes on any issues
- ✅ Screenshot problems if they occur
- ✅ Test on different devices/browsers
- ✅ Be honest - mark Fail if something is wrong

### After Each Test
- ✅ Mark result (Pass/Fail)
- ✅ Add meaningful comments
- ✅ Note device/browser if relevant

### When Done
- ✅ Review all Failed tests
- ✅ Export your report (JSON or CSV)
- ✅ Share with development team
- ✅ Discuss next steps

---

## 📞 Support

If you have questions about:
- **How to use the test page** → Refer to this guide
- **Test results or feedback** → Contact development team
- **Features not working** → Mark as Fail and describe the issue

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 15, 2026 | Initial release with 12 test cases |

---

**Created with ❤️ for Webubble Limited**  
*Making local commerce testing simple and transparent*
