import express, {Express, Request, Response} from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const PORT: number = 3001;

const app: Express = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);
app.use("/img", express.static(path.join(__dirname, "img")));

interface UserData{
    id: number,
    name: string,
    image_url: string
}
// list of user to send to client
let users: UsersData[] = [
    { id: 1, name: "Somsri", image_url: "http://localhost:3001/img/4.jpg"},
    { id: 2, name: "Somsai", image_url: "http://localhost:3001/img/6.jpg"},
    { id: 3, name: "Somorn", image_url: "http://localhost:3001/img/5.jpg"},
];

/*
app.get("/img/4.jpg", (req: Request, res: Response) =>{
    res.sendFile(__dirname+"/img/4.jpg");
});
*/

// get request from client
app.get("/user", (req: Request, res: Response) =>{
    res.status(200).json(
        [
            {das: "sda"},
            {da: "dasd"

    );
});

// client send data to server
app.post("/user", (req: Request, res: Response) =>{
    const { name } = req.body;

    if (!name || typeof name !== "string"){
        return res.status(400).json({result: "Error: Invalid name"});
    }

    const newUser = {
        id: users.length + 1,
        name
    };
    users.push(newUser);
    res.status(200).json({result: "new User added"});
});

app.listen(PORT, ()=> console.log(`Server running at port ${PORT}`));
