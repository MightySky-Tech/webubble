# Storefront UX Testing Plan

**Objective:** Validate that trending products, quick categories, and related products sections improve user experience  
**Timeline:** Before client demo  
**Test Users:** Minimum 5 real users per device type

---

## 🎯 Test Scenarios

### **Scenario 1: Product Discovery (Primary Task)**
**Goal:** User finds a product they want to buy in < 2 minutes

**Test Steps:**
1. User lands on homepage
2. User searches for "tomatoes" (or similar local product)
3. User views product details
4. User adds to cart

**Success Criteria:**
- ✅ Trending products visible without scrolling
- ✅ Categories appear quickly
- ✅ Search suggestions appear in < 250ms
- ✅ Related products help them find alternatives
- ✅ Total time: < 2 minutes
- ✅ User didn't scroll more than 3 times

**UX Metrics to Measure:**
- Time to add product to cart
- Number of times they scroll
- Number of category clicks
- Search refinements (how many times they searched)
- Abandonment points (where they got stuck)

---

### **Scenario 2: Category Browsing**
**Goal:** User browses a category and finds something interesting

**Test Steps:**
1. User lands on homepage
2. User clicks Quick Categories section
3. User selects "Fresh Produce" category
4. User browses products
5. User clicks on a product

**Success Criteria:**
- ✅ Category buttons are obvious
- ✅ Scroll through categories feels smooth
- ✅ No confusion about what category means
- ✅ Products load in < 1 second
- ✅ Product images visible immediately
- ✅ User finds something interesting

**UX Metrics to Measure:**
- Time to select category
- Time to click on product
- Number of products viewed
- Mobile: Horizontal scroll felt smooth?
- Mobile: Touch targets easy to tap?

---

### **Scenario 3: Mobile User Experience**
**Goal:** Verify mobile users can use all features without excessive scrolling

**Device:** iPhone 12 mini (smallest common phone)

**Test Steps:**
1. Load homepage on mobile
2. View trending products (without scrolling)
3. Access quick categories
4. Search for a product
5. View results
6. Click on product
7. Add to cart

**Success Criteria:**
- ✅ Trending visible without scrolling down
- ✅ Quick categories accessible
- ✅ No horizontal scroll (except categories)
- ✅ All text readable (no pinch-to-zoom needed)
- ✅ Buttons are easy to tap (no misclicks)
- ✅ Total scrolls: < 5 times from homepage to cart

**UX Metrics to Measure:**
- Number of vertical scrolls
- Number of mis-taps
- Time to complete journey
- Frustration level (1-5 scale)
- Would they shop again? (Yes/No)

---

### **Scenario 4: Slow Network**
**Goal:** Verify app works on slow 3G connection

**Setup:** Chrome DevTools throttle to "Slow 3G"

**Test Steps:**
1. Load homepage
2. Wait for content
3. Click on trending product
4. Wait for product to load
5. Try to add to cart

**Success Criteria:**
- ✅ Skeleton loaders appear immediately
- ✅ User knows something is loading
- ✅ Doesn't feel broken
- ✅ Takes max 3-5 seconds total
- ✅ Can still add to cart

**UX Metrics to Measure:**
- Time to first paint (should be < 500ms)
- Time to interactive (should be < 2s)
- Did user bounce? (If yes, it's too slow)
- Would they wait? (1-5 scale)

---

### **Scenario 5: Search & Discovery**
**Goal:** Verify search and recommendations work intuitively

**Test Steps:**
1. User types "local vegetables" in search
2. User views search suggestions
3. User sees "What People Buy" section below recommendations
4. User finds a related product
5. User clicks on it

**Success Criteria:**
- ✅ Search suggestions appear as they type
- ✅ Suggestions are relevant
- ✅ "What People Buy" section is visible
- ✅ Related products are actually related
- ✅ No confusion about what section is what
- ✅ User finds something they might buy

**UX Metrics to Measure:**
- Time for search suggestions to appear
- Number of suggestions they view
- Did they use "What People Buy" section? (yes/no)
- Number of products clicked
- Did they add something from related section?

---

## 📱 Device Testing Matrix

**Must test on:**

| Device | Screen Size | Type | Testers |
|--------|------------|------|---------|
| iPhone 12 mini | 375px | Mobile | 2 |
| iPhone 13 | 390px | Mobile | 2 |
| Samsung S20+ | 440px | Mobile | 2 |
| iPad Air | 820px | Tablet | 1 |
| MacBook Pro | 1440px | Desktop | 1 |

---

## 🎓 Testing Script

**Introduction (1 min):**
> "Thank you for helping us test Webubble. We want to make sure our marketplace is easy to use. I'll ask you to do some tasks while I observe. There are no wrong answers - we're testing the site, not you. Feel free to think out loud. Ready?"

**Task 1 - Cold Start (2 min):**
> "Imagine you want to buy fresh tomatoes. Please show me how you'd find them on this site."

**Task 2 - Browse Category (2 min):**
> "Now, without searching, can you browse the Fresh Produce category and show me something you might buy?"

**Task 3 - Open Ended (2 min):**
> "Look around and tell me - what's most interesting to you on this page?"

**Debrief (3 min):**
- What was the easiest part?
- What was confusing?
- Would you use this to shop?
- What would you change?

---

## 📊 Data to Collect

**For Each User:**
- ✍️ Device type & screen size
- ⏱️ Time to complete each task
- 📍 Scroll count per screen
- 🖱️ Click sequence (what they clicked)
- 😕 Confusion points (where they hesitated)
- 💭 Quotes (direct feedback)
- ⭐ Satisfaction (1-5 scale)
- 🔄 Would they return? (yes/no)

---

## ✅ Success Thresholds

**Feature Passes If:**
- ✅ 4 out of 5 users complete tasks successfully
- ✅ Average time to find product < 2 minutes
- ✅ Average scrolls < 5 on mobile
- ✅ All users rate experience 4+ out of 5
- ✅ No user comments "confusing" or "broken"
- ✅ 4+ users would actually shop on this site

**Feature Needs Iteration If:**
- ❌ < 3 users complete successfully
- ❌ Time to find product > 3 minutes
- ❌ Mobile scrolls > 8
- ❌ Average rating < 3.5
- ❌ Multiple users confused about same thing
- ❌ < 3 users would shop on this site

---

## 🐛 Common Issues to Watch For

**Discovery Issues:**
- User can't find search bar
- User doesn't notice trending products
- User scrolls past categories
- User doesn't understand what category means

**Navigation Issues:**
- User clicks back and loses progress
- User doesn't know how to get back to browse
- User gets stuck on a screen
- User can't scroll categories smoothly

**Mobile Issues:**
- Text too small to read
- Buttons too small to tap
- Excessive scrolling required
- Horizontal scroll when shouldn't be
- Images don't load
- Lags/stuttering

**Trust Issues:**
- User doesn't believe prices are real
- User doesn't trust seller info
- User worried about no reviews/ratings
- User unsure about delivery

---

## 📋 Testing Checklist

**Before Starting:**
- [ ] Test links are live and working
- [ ] No console errors (Dev Tools)
- [ ] Network throttling set up (for slow test)
- [ ] Screenshots ready
- [ ] Video recording enabled (with permission)
- [ ] Timer/stopwatch ready

**During Testing:**
- [ ] User gives consent to record (if recording)
- [ ] User thinks aloud
- [ ] Don't help unless they're stuck for 30s
- [ ] Note exact time and sequence
- [ ] Capture exact quotes
- [ ] Observe emotional responses

**After Testing:**
- [ ] Ask debrief questions
- [ ] Get rating (1-5)
- [ ] Ask if they'd return
- [ ] Thank them
- [ ] Note first impressions

---

## 📈 Analysis & Reporting

**After all 5 users tested, analyze:**

1. **Task Completion**
   - How many completed each task?
   - What was the most common failure?

2. **Time Analysis**
   - Average time per task
   - Fastest user vs slowest
   - Where did they get stuck?

3. **Scroll Analysis**
   - Average scrolls (desktop vs mobile)
   - Scroll patterns (up/down/sideways)
   - Did scrolling feel smooth?

4. **Click Patterns**
   - What did they click first?
   - Did they explore or go direct?
   - Any confusion about clickability?

5. **Feedback Themes**
   - Most common positive comment
   - Most common negative comment
   - Recommended improvement
   - Surprising discoveries

6. **Overall Rating**
   - Average user satisfaction (1-5)
   - Would they return? (%)
   - Net Promoter Score (NPS)

---

## 🎁 Deliverables

After testing, provide:
1. **Testing Report** (PDF)
   - Executive summary
   - Methodology
   - Findings by scenario
   - Recommendations

2. **Video Highlights** (5-10 min montage)
   - Successful user journeys
   - Confusing moments
   - User quotes
   - Emotional reactions

3. **Heatmap/Click Analysis**
   - Where users clicked
   - Scroll patterns
   - Time spent per section

4. **Prioritized Issues**
   - Critical (blocks task)
   - Important (confuses users)
   - Nice-to-have (small friction)

---

## 📞 Client Communication

Share findings with Webubble:
- ✅ "5 real users tested the new sections"
- ✅ "X% completed tasks successfully"
- ✅ "Average satisfaction: 4.2/5"
- ✅ "Here's video of real users interacting"
- ✅ "These are our recommendations"
- ✅ "We'll implement improvements in next sprint"

---

## 🎯 Next Testing Phases

**After storefront validates:**
1. Test authentication flows (sign up/login)
2. Test product detail pages
3. Test checkout process
4. Test seller onboarding
5. Test admin dashboard

---

**Testing Status:** 🔄 Ready to execute  
**Estimated Time:** 2-3 hours total (5 users × 25 min each)  
**Success Metric:** Positive UX feedback, tasks completed, users would return
