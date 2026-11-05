// Where to go on launch, decided from the session (the splash screen covers this until auth is known).
import { Redirect } from "expo-router";
import { useSession } from "~/store/session";
import { placeFor } from "~/lib/routing";
import { Loading } from "~/ui/Loading";

export default function Gate() {
  const target = useSession(placeFor);
  if (!target) return <Loading />;
  return <Redirect href={target} />;
}
