import { fetchFromFirestore, saveToFirestore } from './server/firebase';
async function test() {
  const data = await fetchFromFirestore();
  console.log("Fetched schools count:", data ? data.schools.length : "None");
  if (data && data.schools) {
    console.log("School 1 Name:", data.schools[0].name);
  }
}
test();
