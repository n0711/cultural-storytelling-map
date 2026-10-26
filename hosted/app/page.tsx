import Narrify from './narrify';
import { initialData } from '../lib/server';
export const dynamic='force-dynamic';
export default async function Home(){return <Narrify initial={await initialData()}/>}
