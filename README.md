# SplitTrip

**A shared-expense product prototype that separates who paid from who actually consumed.**

[Try the live prototype](https://hassansaber1911-dot.github.io/Splittrip/)

## Product Overview
Splitting a restaurant bill or trip expense becomes inaccurate when different people pay and consume different things. SplitTrip models those two facts separately and calculates the final balances from actual participation.

## The Problem
Most simple bill-splitting approaches assume everyone consumed the same amount. Real group spending is messier: one person may pay for everyone, several people may contribute to one bill, some members may skip individual items, and tax or service fees still need to be allocated fairly.

## Core Experience
- Create trips and add members
- Record shared expenses and individual items
- Select the consumers of each item
- Support multiple payers on one expense
- Distribute tax, service charges, and other fees
- Calculate member balances and who owes whom
- Record full or partial settlements with confirmation
- Review member expense history and previous trips

## Core Product Rule
**Paid ≠ Consumed.**

For every expense, SplitTrip calculates what each member consumed and compares it with what they paid. The difference becomes that member's balance. This rule is the foundation of the product rather than an edge case layered onto an equal-split calculator.

## Product Decisions
**Item-level participation over blanket equal splitting.** Consumers are attached to items so mixed participation remains accurate.

**Multiple payers are first-class.** One expense can be funded by more than one person.

**Settlement is separate from spending.** Paying back a friend changes balances without rewriting the original expense history.

## Tech Stack
HTML, CSS, vanilla JavaScript, browser Local Storage, Google Analytics 4, and GitHub Pages.

## Current Scope
This is a functional product prototype, not a production financial application. It has no user accounts, cloud sync, payment processing, or shared real-time trip state yet.

## Roadmap Opportunities
- Shared accounts and cloud synchronization
- Invite links for trip members
- Receipt capture and assisted item entry
- Multiple currencies and exchange-rate handling
- Settlement reminders and payment integrations
- Richer trip summaries and exports

## About This Project
SplitTrip was built as a product exercise around a deceptively complex business rule: accurately reconcile **who paid, who consumed, and who owes whom**.

**Built by Hassan Mohamed Saber**
