import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
export default async function Home() { const user=await getCurrentUser(); redirect(!user?"/login":user.role==="STAFF"?"/staff":user.role==="OPERACIONES"?"/eventos":"/dashboard"); }
