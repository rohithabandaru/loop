import { parse } from "csv-parse/sync";

function run(name, csv) {
  try {
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
      relax_quotes: true,
    });
    console.log(`\n=== ${name} ===`);
    console.log(JSON.stringify(records, null, 2));
  } catch (e) {
    console.log(`\n=== ${name} ERROR ===`);
    console.log(e.message);
  }
}

run(
  "Normal",
  `content,channel,customerLabel
Onboarding was slow,SUPPORT_TICKET,Acme Corp
Love the fast dashboard,APP_STORE_REVIEW,Jane Doe`
);

run(
  "Unquoted commas in content",
  `content,channel,customerLabel
The app is slow, buggy, and crashes often,SUPPORT_TICKET,Acme`
);

run(
  "Quoted commas in content",
  `content,channel,customerLabel
"The app is slow, buggy, and crashes often",SUPPORT_TICKET,Acme`
);

run(
  "Headers with spaces",
  `Content, Channel, Customer Label
Hello world feedback text,SUPPORT_TICKET,Acme Corp`
);

run(
  "Semicolon delimiter",
  `content;channel;customerLabel
Onboarding was slow;SUPPORT_TICKET;Acme Corp`
);

run(
  "BOM + CRLF",
  `\uFEFFcontent,channel,customerLabel\r\nOnboarding was slow,SUPPORT_TICKET,Acme Corp\r\n`
);

run(
  "Tab delimiter",
  `content\tchannel\tcustomerLabel
Onboarding was slow\tSUPPORT_TICKET\tAcme Corp`
);

// Simulate getValue helper
function getValue(row, candidateKeys) {
  const rowKeys = Object.keys(row);
  for (const key of candidateKeys) {
    const match = rowKeys.find((rk) => rk.trim().toLowerCase() === key.toLowerCase());
    if (match && row[match] !== undefined && row[match] !== null) {
      return String(row[match]).trim();
    }
  }
  return "";
}

const spaced = parse(
  `Content, Channel, Customer Label
Hello world feedback text,SUPPORT_TICKET,Acme Corp`,
  { columns: true, skip_empty_lines: true, trim: true }
);
console.log("\n=== getValue with spaced headers ===");
console.log("content:", getValue(spaced[0], ["content", "feedback", "text"]));
console.log("channel:", getValue(spaced[0], ["channel", "source"]));
console.log(
  "customer:",
  getValue(spaced[0], ["customerlabel", "customer_label", "customer", "user", "email", "client"])
);
console.log("keys:", Object.keys(spaced[0]));
