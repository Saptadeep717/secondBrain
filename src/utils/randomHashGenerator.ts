import { nanoid } from "nanoid";

export default function randomId(len = 10): string {
  return nanoid(len);
}
