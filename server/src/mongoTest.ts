import "dotenv/config";
import { connectMongo } from "./database/mongoDB/conection";
import { UserModel } from "./database/mongoDB/models/rutaEntrega.model";

async function main() {
  await connectMongo();

  const user = await UserModel.create({
    name: "Carlos",
    email: "carlos@test.com",
    password: "234567890"
  });

  console.log(user.getName())

  console.log("Created Mongo user:", user);

  const users = await UserModel.find();
  console.log("All Mongo users:", users);
}

main();