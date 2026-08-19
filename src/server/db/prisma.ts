import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function pooledDatabaseUrl(){
  const value=process.env.DATABASE_URL;
  if(!value||process.env.NODE_ENV!=="production")return value;
  const url=new URL(value);
  if(!url.searchParams.has("connection_limit"))url.searchParams.set("connection_limit","1");
  if(!url.searchParams.has("pool_timeout"))url.searchParams.set("pool_timeout","20");
  return url.toString();
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({datasourceUrl:pooledDatabaseUrl()});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
