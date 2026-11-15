# AI, privacy, and listing trust

## AI search

The AI feature turns natural-language search text into a fixed set of filters: city, locality, sale/resale/rent, property type, maximum budget, and bedrooms. OpenAI Structured Outputs constrains the response to the schema. The server validates the values and then searches the local listing database. Results do not come from the model.

Without an API key, a small local parser recognizes common city names, localities, BHK counts, property types, and INR crore/lakh amounts. This is deterministic keyword parsing, not a trained machine-learning model. No interaction data is currently used to train or rank properties.

AI is intentionally not used to decide creditworthiness, eligibility, legal status, property value, or a person's suitability. Lead routing uses the submitted enquiry and listing only.

## Data handled

- Buyer enquiry: name, phone, optional email, message, and selected sample listing.
- Seller enquiry: contact information and property details supplied in the form.
- Agent Desk: enquiry data and lead stage, available only when the server access token is configured.
- Customer login/register: the phone-first screen is a provider-ready interface only. SMS verification and customer sessions remain disabled until an OTP provider is integrated.
- AI search: only the free-text property query; contact details are never included.

The local demo stores favourites in the browser and enquiries in SQLite. A public service needs a privacy notice that matches actual use, consent language, security controls, a retention period, a deletion workflow, access logs, and a protected database.

## Listing trust

All supplied property data and photos are illustrative examples. The site does not check ownership/title, RERA registration, building approvals, encumbrances, land classification, measurements, price, or availability. Sample badges and disclaimers remain visible in this version.

The database includes a RERA project number field for future reviewed inventory, but it is intentionally blank on all sample listings. Never publish an unverified number. Requirements vary by state and transaction type; check the applicable state authority and legal advice before launch.

## Safer expansion

If real inventory is added, implement staff identity and permissions, listing review and expiry, owner/agent verification, document access controls, image upload validation, audit trails, secure notification routing, retention/deletion, and source-of-truth links. Any future recommendation score should be explainable, use lawful and relevant fields, avoid protected or sensitive traits, and be reviewed for unequal effects.
