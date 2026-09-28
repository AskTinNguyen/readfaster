/** Example agent responses used to demo the analyzer and reader. */

export interface Sample {
  id: string;
  label: string;
  text: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'verbose-coding',
    label: 'Verbose coding-agent report',
    text: `Great question! I'd be happy to help you understand what happened with the failing build. Let me walk you through everything I did step by step so that you have a complete picture of the situation.

First, I took a look at the CI logs in order to understand the root cause of the failure. It's worth noting that the error message was actually quite misleading, because it pointed at the test runner, but the real issue was basically somewhere else entirely, which is something that happens fairly often in projects that have a large number of interdependent packages and a complex build configuration like this one does.

After investigating further, I discovered that the problem was due to the fact that the lockfile had been updated in a previous commit without the corresponding change to the package manifest, which meant that the CI environment was installing a different version of the date library than the one that developers have locally, and this newer version has a breaking change in the way it parses ISO timestamps with time zone offsets.

In order to fix this, I pinned the date library to the previous version in package.json, regenerated the lockfile, and re-ran the full test suite locally. All 412 tests are now passing. I also added a regression test that specifically checks timestamp parsing with offsets so that this kind of issue is caught earlier in the future.

It's important to note that we might possibly want to upgrade the library properly at some point, since the old version will eventually stop receiving security updates. However, that would require changes in a number of places in the codebase.

I hope this helps! Let me know if you have any other questions or if you'd like me to make any further changes.`,
  },
  {
    id: 'tight-coding',
    label: 'Same report, fast-read format',
    text: `**Fixed: CI build is green again.** A lockfile/manifest mismatch made CI install a newer date library that parses ISO timestamps with offsets differently.

**Changes**
- Pinned the date library to the previous version in \`package.json\` and regenerated the lockfile.
- Added a regression test for timestamp parsing with offsets.
- All 412 tests pass locally.

**Needs your decision**
- The pinned version will stop getting security updates. Upgrading properly touches ~6 call sites. Want a follow-up PR?`,
  },
  {
    id: 'verbose-comparison',
    label: 'Comparison written as prose',
    text: `Certainly! When it comes to choosing between PostgreSQL and MongoDB for your project, there are a number of factors that you should consider, and it's worth noting that both are excellent databases that are widely used in production by many companies of all sizes.

PostgreSQL is a relational database, which means that it stores data in tables with a fixed schema, and it has very strong support for transactions, joins, and complex queries, which makes it a great fit for applications where data integrity and relationships between entities are really important, such as financial systems or e-commerce platforms. MongoDB, on the other hand, is a document database that stores data as flexible JSON-like documents, which can make it easier to get started with and to evolve your data model over time, and it scales horizontally quite well, although it has historically had weaker support for multi-document transactions, which it has improved in more recent versions.

In terms of your specific use case, since you mentioned that you have a lot of relational data with users, orders and invoices, I would generally lean towards recommending PostgreSQL, but it really depends on your team's familiarity and your long-term scaling plans.

I hope this overview is helpful! Feel free to reach out if you have any further questions.`,
  },
];
