import { importDashboardDemoData } from "../src/modules/admin/demo-data-import.service";

async function main() {
  const result = await importDashboardDemoData();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
