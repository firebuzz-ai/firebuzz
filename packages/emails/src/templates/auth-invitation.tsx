import { projectConfig } from "@firebuzz/project-config";
import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { tailwindConfig } from "./tailwind-config";

export interface AuthInvitationTemplateProps {
  invitedByUsername: string;
  teamName: string;
  inviteLink: string;
  userEmail: string;
}

const AuthInvitationTemplate = ({
  invitedByUsername = "Batuhan Bilgin",
  teamName = "hortiturkey",
  inviteLink = "https://vercel.com/teams/invite/foo",
  userEmail = "digitalsepa@gmail.com",
}: AuthInvitationTemplateProps) => {
  const previewText = `Join ${invitedByUsername} on Firebuzz`;
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Geist"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-400-normal.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Geist"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-500-normal.woff2",
            format: "woff2",
          }}
          fontWeight={500}
          fontStyle="normal"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind config={tailwindConfig}>
        <Body className="px-6 font-sans text-base bg-muted text-foreground py-45">
          <Container className="bg-white rounded-lg p-45">
            <Img
              src={projectConfig.icon}
              width="50"
              height="50"
              alt={projectConfig.name}
              className="mb-20"
            />
            <Heading className="my-0 leading-8">
              You are invited to <strong>{projectConfig.name}</strong>
            </Heading>
            <Section>
              <Row>
                <Text
                  style={{
                    color: "black",
                    fontSize: "14px",
                    lineHeight: "24px",
                  }}
                >
                  Hey there!
                </Text>
                <Text
                  style={{
                    color: "black",
                    fontSize: "14px",
                    lineHeight: "24px",
                  }}
                >
                  <strong>{invitedByUsername}</strong> has invited you to the
                  team <strong>({teamName})</strong> on Firebuzz.
                </Text>
              </Row>
            </Section>
            <Section className="text-center">
              <Container className="max-w-full">
                <Button
                  href={inviteLink}
                  className="py-3 w-full text-white rounded-lg bg-primary"
                >
                  Join the Team
                </Button>
              </Container>
            </Section>
          </Container>
          <Container>
            <Section>
              <Text
                style={{
                  color: "#666666",
                  fontSize: "12px",
                  lineHeight: "24px",
                }}
              >
                This invitation was intended for{" "}
                <span style={{ color: "black" }}>{userEmail} </span>. If you
                were not expecting this invitation, you can ignore this email.
                If you are concerned about your account&apos;s safety, please
                reply to this email to get in touch with us.
              </Text>
            </Section>
          </Container>
          <Container className="mt-20">
            <Text className="text-center text-gray-400">
              All rights reserved. {projectConfig.name} ©{" "}
              {new Date().getFullYear()}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AuthInvitationTemplate;
