# Test Prompts for Complaint Dataset Generator

Use these example conversations to test the agent's data collection and dataset generation capabilities.

---

## Test Case 1: E-commerce Business

### Conversation Flow

**User Prompt 1:**
```
I run an e-commerce platform selling electronics and gadgets.
```

**User Prompt 2:**
```
We primarily sell to tech enthusiasts and everyday consumers looking for smartphones, laptops, tablets, and smart home devices. Our customers range from 18-45 years old, mostly urban professionals.
```

**User Prompt 3:**
```
Our main products include smartphones, laptops, tablets, smartwatches, wireless earbuds, and smart home accessories. We also offer extended warranties and same-day delivery in select cities.
```

**User Prompt 4:**
```
Common issues include delivery delays, products arriving damaged, discrepancies between product images and actual items, and difficulty getting refunds processed. Some customers also complain about the app crashing during flash sales.
```

**User Prompt 5:**
```
We use terms like SKU, COD (cash on delivery), EMI options, open-box products, flash deals, and prime membership for faster shipping.
```

---

## Test Case 2: Healthcare Clinic

### Conversation Flow

**User Prompt 1:**
```
I manage a multi-specialty healthcare clinic.
```

**User Prompt 2:**
```
We're a private healthcare facility offering outpatient services including general medicine, pediatrics, dermatology, orthopedics, and diagnostic services like blood tests and imaging.
```

**User Prompt 3:**
```
Our patients are families with health insurance, elderly individuals needing regular checkups, and working professionals seeking quick consultations. Age range is from newborns to seniors.
```

**User Prompt 4:**
```
Patients often complain about long waiting times even with appointments, difficulty reaching the clinic by phone, unclear billing for insurance claims, and test results taking too long.
```

**User Prompt 5:**
```
Common terms include OPD, vitals, prescription refills, lab panels, copay, deductibles, referral letters, and follow-up appointments.
```

---

## Test Case 3: SaaS Company (One-Shot Comprehensive)

### Single Comprehensive Prompt

**User Prompt:**
```
I run a B2B SaaS company that provides project management and team collaboration software. Our target customers are small to medium businesses, startups, and enterprise teams ranging from 10 to 500 employees. 

Our main features include task boards, time tracking, file sharing, team chat, reporting dashboards, and integrations with tools like Slack, Google Workspace, and Microsoft 365.

Common pain points from customers include:
- Sync issues between desktop and mobile apps
- Features being locked behind expensive enterprise tiers
- Difficulty migrating data from other tools
- Slow customer support response times
- Confusion about pricing changes

We use terms like workspace, sprint, backlog, burndown chart, user seats, SSO (single sign-on), API rate limits, and SLA (service level agreement).
```

---

## Test Case 4: Restaurant Chain

### Conversation Flow

**User Prompt 1:**
```
We're a fast-casual restaurant chain specializing in Asian fusion cuisine.
```

**User Prompt 2:**
```
We have 15 locations across the city, offering dine-in, takeout, and delivery through our app and third-party platforms. Our menu includes rice bowls, noodles, dumplings, and bubble tea.
```

**User Prompt 3:**
```
Our customers are young professionals aged 20-40, college students, and families looking for quick, affordable, and flavorful meals. We're popular for lunch and dinner rushes.
```

**User Prompt 4:**
```
Customers often complain about orders being incorrect, long wait times during peak hours, food arriving cold for delivery, inconsistent portion sizes across locations, and loyalty points not being credited properly.
```

**User Prompt 5:**
```
We use terms like combo meals, add-ons, spice level customization, meal prep, ghost kitchen, and third-party delivery fees.
```

---

## Test Case 5: Online Education Platform

### Conversation Flow

**User Prompt 1:**
```
I operate an online education platform offering professional certification courses.
```

**User Prompt 2:**
```
We offer courses in data science, digital marketing, cloud computing, and UX design. Our courses include video lectures, hands-on projects, quizzes, and certificates upon completion.
```

**User Prompt 3:**
```
Our learners are working professionals looking to upskill or transition careers, recent graduates seeking certifications, and HR departments purchasing bulk licenses for employee training.
```

**User Prompt 4:**
```
Common complaints include certificate download issues, courses becoming outdated, mentor response delays, video buffering problems, and confusion about subscription vs. one-time purchase pricing.
```

**User Prompt 5:**
```
Industry terms include LMS, cohort-based learning, self-paced courses, capstone projects, proctored exams, CPD credits, and micro-credentials.
```

---

## Test Case 6: Minimal Information Test

### Purpose
Test agent's ability to ask follow-up questions

**User Prompt 1:**
```
I have a business.
```

*Expected: Agent should ask what type/industry*

**User Prompt 2:**
```
It's a gym.
```

*Expected: Agent should ask for more details about the business and customers*

**User Prompt 3:**
```
We offer memberships for fitness equipment and classes. Our members are health-conscious adults.
```

*Expected: Agent should confirm readiness or ask about pain points/terminology*

---

## Test Case 7: Financial Services

### Comprehensive Prompt

**User Prompt:**
```
We're a digital-first bank and financial services company targeting millennials and Gen Z customers. 

Our services include:
- Mobile banking with zero-fee checking accounts
- High-yield savings accounts
- Investment portfolios with robo-advisory
- Credit cards with cashback rewards
- Peer-to-peer payments
- Cryptocurrency trading

Our customers are typically 22-40 years old, tech-savvy, and prefer managing everything through our mobile app. They value transparency, low fees, and instant transactions.

Common issues reported:
- App login failures and biometric authentication problems
- Delayed transaction postings
- Confusion about fee structures
- Difficulty reaching human support
- Fraud alerts blocking legitimate transactions

Banking terminology we use: ACH transfers, wire fees, APY, FDIC insured, routing number, dispute resolution, chargeback, credit utilization, and KYC verification.
```

---

## Test Case 8: Hotel & Hospitality (Quick Test)

### Single Comprehensive Prompt for Fast Generation

**User Prompt (Copy & Paste This):**
```
I manage a 4-star boutique hotel chain called "Azure Stays" with 8 properties across major tourist destinations.

Our services include:
- Luxury rooms and suites with city/ocean views
- 24/7 concierge and room service
- On-site restaurants, bars, and spa facilities
- Conference rooms and event spaces
- Airport shuttle and valet parking
- Swimming pools, gyms, and wellness centers
- Loyalty program with points and tier benefits

Our guests are primarily business travelers (35-55), couples on vacation (28-45), and families during holiday seasons. International tourists make up about 40% of our bookings.

Common complaints we receive:
- Room not matching photos on booking site
- AC/heating not working properly
- Noise from other guests or construction
- Slow WiFi or connectivity issues
- Check-in delays especially during peak hours
- Housekeeping missed or incomplete
- Restaurant food quality inconsistent
- Hidden resort fees and charges
- Loyalty points not credited correctly
- Pool/spa facilities overcrowded or closed for maintenance
- Lost or damaged luggage by staff
- Unresponsive front desk
- Bed bugs or cleanliness issues
- Overbooking leading to room downgrades
- Early check-out charges applied incorrectly

Hotel terminology we use: RevPAR, ADR, OTA (Online Travel Agency), PMS (Property Management System), comp nights, rack rate, late checkout, turn-down service, amenity fee, resort fee, incidentals hold, folio, no-show policy, and blackout dates.
```

---

## Expected Outputs

After completing any test case, the generated dataset should:

1. ✅ Have exactly 20 rows (one per risk subcategory)
2. ✅ Include the correct header format: `Risk Code,[Industry]`
3. ✅ Contain realistic complaints specific to the industry
4. ✅ Use terminology mentioned in the conversation
5. ✅ Match the universal patterns from Table 2

---

## Verification Checklist

After each test, verify:

- [ ] All required checklist items are marked complete
- [ ] The "Generate Dataset" button becomes enabled
- [ ] Dataset preview appears after generation
- [ ] CSV download works correctly
- [ ] Downloaded file has proper formatting