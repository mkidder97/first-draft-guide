

## Add Sample Contacts for Existing Clients

No code changes needed — this is a data seeding task using the database insert tool.

### What will be created

**5 contacts** (one per client), with realistic property management names/emails:

| Client | Contact Name | Email | Phone | Title |
|--------|-------------|-------|-------|-------|
| Northgate Industrial Partners | Mike Torres | mike.torres@northgateindustrial.com | (214) 555-0142 | Director of Operations |
| Meridian Property Group | Jessica Chen | jessica.chen@meridianpg.com | (713) 555-0198 | Property Manager |
| Pinnacle Asset Management | David Hartley | david.hartley@pinnacleam.com | (512) 555-0276 | VP of Facilities |
| Coastal Industrial Partners | Rachel Kim | rachel.kim@coastalip.com | (281) 555-0334 | Asset Manager |
| Summit Commercial REIT | Brian Caldwell | brian.caldwell@summitcreit.com | (469) 555-0411 | Director of Real Estate |

### Steps

1. Insert 5 contacts into the `contacts` table
2. Update each client's `contact_id` to link to its new contact

These contacts will then be available for future email integration and automations — the agreement detail page already shows the linked contact info.

