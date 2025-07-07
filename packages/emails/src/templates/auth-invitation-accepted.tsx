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

export interface AuthInvitationAcceptedTemplateProps {
  memberEmail: string;
  teamName: string;
  appLink: string;
}

const AuthInvitationAcceptedTemplate = ({
  memberEmail = "batuhan@makr.dev",
  teamName = "hortiturkey",
  appLink = "https://app.getfirebuzz.com",
}: AuthInvitationAcceptedTemplateProps) => {
  const previewText = `A new member has joined`;
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
              A new member has joined
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
                  <strong>{memberEmail}</strong> has joined{" "}
                  <strong>{teamName}</strong> via an invitation.
                </Text>
              </Row>
            </Section>
            <Section className="text-center">
              <Container className="max-w-full">
                <Button
                  href={appLink}
                  className="py-3 w-full text-white rounded-lg bg-primary"
                >
                  Go to application
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
                If you're having trouble with the above button,{" "}
                <a href={appLink} style={{ color: "#6c47ff" }}>
                  click here
                </a>
                .
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

export default AuthInvitationAcceptedTemplate;
