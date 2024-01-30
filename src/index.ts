import express from "express";
import dotenv from "dotenv";
import { hashSync, genSaltSync } from "bcrypt";
import { StreamChat } from "stream-chat";

dotenv.config();

const { PORT, STREAM_API_KEY, STREAM_API_SECRET } = process.env;

const client = StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SECRET);

const app = express();
app.use(express.json());
const salt = genSaltSync(10);

interface User {
    id: string;
    email: string;
    hashed_password: string;
}

const USERS: User[] = [];

app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = USERS.find((user) => user.email === email);
    if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
    }

    try {
        const hashedPassword = hashSync(password, salt);
        const id = Math.random().toString(16).slice(2);

        const user = {
            id,
            email,
            hashed_password: hashedPassword
        }
        USERS.push(user)

        await client.upsertUser({
            id,
            name: email,
            email,
        })        

        const token = client.createToken(id);

        return res.status(200).json({ user: {id, email}, token });
    } catch (error) {
        res.status(500).json({ error });
    }
})

app.post("/login", (req, res) => {
    const {email, password} = req.body
    const user = USERS.find((user) => user.email === email)
    const hashedPassword = hashSync(password, salt)
    console.log("user:- ", !user)
    if (!user || user.hashed_password !== hashedPassword) {
        return res.status(401).json({ error: "Invalid credentials" })
    }

    const token = client.createToken(user.id)

    return res.status(200).json({ user: {id: user.id, email: user.email}, token })
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})