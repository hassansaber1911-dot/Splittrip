# 💸 SplitTrip

SplitTrip is a functional prototype exploring a common problem when traveling or spending with friends:

**How do you accurately calculate who owes whom when different people pay for different things — and not everyone consumes the same items?**

## 💡 The Idea

Most shared-expense scenarios become complicated because **paying for something doesn't necessarily mean consuming it**.

SplitTrip treats these as two separate concepts:

**Paid ≠ Consumed**

For every expense, the app tracks:
- Who paid
- How much each person paid
- Who consumed each item
- How the cost should be distributed

It then calculates the final balances and shows **who owes whom**.

## ✨ Key Features

- Create trips and add members
- Add shared expenses
- Item-level consumer selection
- Multiple payers for one expense
- Automatic equal splitting between selected consumers
- Tax and service charge distribution
- Individual balances
- Who-owes-whom calculation
- Full and partial settlements
- Settlement confirmation
- Member expense history
- Trip history

## 🧠 Product Thinking

One of the main decisions behind SplitTrip was separating **payment from consumption**.

For example:

Hassan pays 300 SAR for dinner.

But:
- Hassan consumed 100 SAR
- Ahmed consumed 120 SAR
- Sara consumed 80 SAR

The app should not simply divide 300 SAR equally.

Instead, it calculates each person's actual consumption and compares it with what they paid.

This business rule became the foundation of the product.

## 🚀 Live Prototype

👉 **[Try SplitTrip](https://hassansaber1911-dot.github.io/Splittrip/)**

## 🧪 Project Status

SplitTrip is a functional product prototype built to explore the problem, business rules, user flows, and edge cases — not a production application.

The current version uses browser Local Storage, so data is stored locally on each user's device.
