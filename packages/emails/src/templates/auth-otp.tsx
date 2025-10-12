import { projectConfig } from "@firebuzz/project-config";
import {
  Body,
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
import * as React from "react";
import { tailwindConfig } from "./tailwind-config";

export interface AuthOTPTemplateProps {
  requestedAt: string;
  requestedBy?: string;
  requestedFrom?: string;
  otpCode: string;
  ttlMinutes?: number;
}

const PropDefaults: AuthOTPTemplateProps = {
  requestedAt: new Date().toISOString(),
  requestedBy: "Unknown",
  requestedFrom: "Unknown",
  otpCode: "000000",
  ttlMinutes: 10,
};

const AuthOTPTemplate = ({
  requestedAt,
  requestedBy = PropDefaults.requestedBy,
  requestedFrom = PropDefaults.requestedFrom,
  otpCode = PropDefaults.otpCode,
  ttlMinutes = PropDefaults.ttlMinutes,
}: AuthOTPTemplateProps): React.ReactElement => {
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
      <Preview>Your verification code is ready.</Preview>
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
            <Heading className="my-0 leading-8">Verification Code</Heading>
            <Section>
              <Row>
                <Text className="text-base">
                  Enter the following code on {projectConfig.name}. This code
                  will{" "}
                  <span className="font-bold">
                    expire in {ttlMinutes} minutes.
                  </span>
                </Text>
              </Row>
            </Section>
            <Section>
              <Container className="max-w-full text-center">
                <Text className="py-3 w-full text-xl text-white rounded-lg bg-primary">
                  {otpCode}
                </Text>
              </Container>
              <Container className="mt-5">
                <Text>
                  Do not share this code with anyone to protect your account.
                </Text>
              </Container>
              <Container className="mt-20 mb-0">
                <Text className="text-lg font-medium">
                  Did not request this?
                </Text>
                <Text className="">
                  This magic link was requested from{" "}
                  <span className="font-medium">{requestedFrom}</span> by{" "}
                  <span className="font-medium">{requestedBy}</span> at{" "}
                  <span className="font-medium">{requestedAt}</span>. If you
                  didn't make this request, you can safely ignore this email.
                </Text>
              </Container>
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

export default AuthOTPTemplate;
