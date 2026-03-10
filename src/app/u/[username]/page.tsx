import { PublicProfile } from "~/features/profile/public-profile";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  return <PublicProfile username={username} />;
}
