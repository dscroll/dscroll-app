"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Spinner,
  useToast,
  IconButton,
  Card,
  CardBody,
  Icon,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Container,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Divider,
  useColorModeValue,
  Switch,
  Tag,
  Badge,
  Spacer,
  Image,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiUser, FiMail, FiShield, FiCheckCircle, FiGlobe, FiZap, FiToggleRight, FiExternalLink } from "react-icons/fi";
import { useAccount, useSignMessage } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import Web3PageContainer from "@/components/Web3PageContainer";
import { saveRecord, getRecord } from "@/app/actions/records";

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);
const MotionCard = motion(Card);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PageProps {
  params: Promise<{ subname: string }>;
}

export default function RecordPage({ params }: PageProps) {
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const toast = useToast();

  const [subname, setSubname] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [emailError, setEmailError] = useState("");
  const [odudeEnabled, setOdudeEnabled] = useState(false);

  // Theme-aware colors
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const inputBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const inputFocusBg = useColorModeValue("white", "gray.700");
  const inputTextColor = useColorModeValue("gray.800", "whiteAlpha.900");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");

  useEffect(() => {
    const init = async () => {
      try {
        const resolvedParams = await params;
        const name = decodeURIComponent(resolvedParams.subname);
        setSubname(name);

        // Fetch existing record
        const result = await getRecord(name);
        if (result.success && result.data) {
          setFormData({
            name: result.data.name || "",
            email: result.data.email || "",
          });
          setOdudeEnabled(Boolean(result.data.odude));
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [params]);

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setEmailError("Email address is required.");
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("Please enter a valid email address (e.g. john@example.com).");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, email: val });
    if (emailError) validateEmail(val);
  };

  const isExportReady = odudeEnabled && formData.email && !emailError && formData.name;

  const handleExport = () => {
    window.open(`https://name.odude.com/dscroll?name=${subname}`, '_blank');
  };

  const handleSave = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet before saving a record.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Display Name Required",
        description: "Please enter a Record Display Name before saving.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (!validateEmail(formData.email)) {
      toast({
        title: "Invalid Email Address",
        description: emailError || "Please enter a valid email address before saving.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const message = `Update off-chain record for ${subname}\nName: ${formData.name}\nEmail: ${formData.email}\nWallet: ${address}\nTimestamp: ${timestamp}`;

      const signature = await signMessageAsync({ message });

      const result = await saveRecord({
        subname,
        name: formData.name,
        email: formData.email,
        walletAddress: address,
        signature,
        message,
        odude: odudeEnabled,
      });

      if (result.success) {
        toast({
          title: "✅ Record Saved",
          description: "Your off-chain record has been updated and verified successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        setTimeout(() => router.back(), 1500);
      } else {
        toast({
          title: "Save Failed",
          description: result.error || "An unexpected error occurred. Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      const isUserRejected =
        error?.code === 4001 ||
        error?.message?.toLowerCase().includes("user rejected") ||
        error?.message?.toLowerCase().includes("user denied");

      toast({
        title: isUserRejected ? "Signature Cancelled" : "Signing Error",
        description: isUserRejected
          ? "You cancelled the signature request. No changes were saved."
          : error.message || "An error occurred while signing. Please try again.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Web3PageContainer>
        <Flex justify="center" align="center" minH="400px">
          <Spinner size="xl" thickness="4px" speed="0.65s" color="brand.400" />
        </Flex>
      </Web3PageContainer>
    );
  }

  return (
    <Web3PageContainer>
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        zIndex="-1"
        bgGradient={useColorModeValue(
          "radial(brand.50 0%, white 100%)",
          "radial(brand.900 0%, gray.900 100%)"
        )}
        opacity={0.4}
      />
      <Container maxW="container.md" py={10}>
        <AnimatePresence>
          <MotionVStack
            align="stretch"
            spacing={8}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header Section */}
            <Box>
              <Breadcrumb fontSize="sm" color="gray.500" mb={4}>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => router.push("/dashboard")}>Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => router.back()}>{subname}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem isCurrentPage>
                  <Text color="brand.400" fontWeight="600">Off-Chain Record</Text>
                </BreadcrumbItem>
              </Breadcrumb>

              <HStack justify="space-between" align="center">
                <HStack spacing={4}>
                  <IconButton
                    aria-label="Back"
                    icon={<FiArrowLeft />}
                    variant="ghost"
                    onClick={() => router.back()}
                    borderRadius="full"
                    _hover={{ bg: "brand.50", color: "brand.500" }}
                  />
                  <VStack align="start" spacing={0}>
                    <Heading size="xl" fontWeight="900" letterSpacing="tight">
                      Off-Chain{" "}
                      <Text as="span" color="brand.400" bgGradient="linear(to-r, brand.400, brand.600)" bgClip="text">
                        Record
                      </Text>
                    </Heading>
                    <Text color="gray.500" fontWeight="500">
                      Enhance your digital identity for {subname}
                    </Text>
                  </VStack>
                </HStack>
                <MotionBox
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  <Icon as={FiGlobe} boxSize={10} color="brand.400" opacity={0.6} />
                </MotionBox>
              </HStack>
            </Box>

            <Divider borderColor={borderColor} />

            {/* Form Card */}
            <MotionCard
              variant="outline"
              bg={useColorModeValue("rgba(255, 255, 255, 0.8)", "rgba(26, 32, 44, 0.85)")}
              backdropFilter="blur(20px)"
              borderColor={borderColor}
              borderRadius="3xl"
              overflow="hidden"
              boxShadow="2xl"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <CardBody p={10}>
                <VStack spacing={8} align="stretch">
                  <Box>
                    <Heading size="md" mb={2}>Profile Details</Heading>
                    <Text fontSize="sm" color="gray.500">
                      This information is stored off-chain and verified by your signature.
                    </Text>
                  </Box>

                  {/* Record Display Name */}
                  <FormControl>
                    <FormLabel
                      fontSize="xs"
                      fontWeight="800"
                      color="gray.400"
                      textTransform="uppercase"
                      letterSpacing="widest"
                    >
                      Record Display Name
                    </FormLabel>
                    <HStack
                      bg={inputBg}
                      borderRadius="2xl"
                      px={5}
                      border="2px solid"
                      borderColor="transparent"
                      _focusWithin={{ borderColor: "brand.400", bg: inputFocusBg, boxShadow: "lg" }}
                      transition="all 0.2s"
                    >
                      <Icon as={FiUser} color="brand.400" flexShrink={0} />
                      <Input
                        variant="unstyled"
                        py={5}
                        placeholder="e.g. John Doe"
                        fontWeight="600"
                        color={inputTextColor}
                        _placeholder={{ color: placeholderColor, fontWeight: "400" }}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </HStack>
                  </FormControl>

                  {/* Email Address */}
                  <FormControl isInvalid={!!emailError}>
                    <FormLabel
                      fontSize="xs"
                      fontWeight="800"
                      color="gray.400"
                      textTransform="uppercase"
                      letterSpacing="widest"
                    >
                      Email Address
                    </FormLabel>
                    <HStack
                      bg={inputBg}
                      borderRadius="2xl"
                      px={5}
                      border="2px solid"
                      borderColor={emailError ? "red.400" : "transparent"}
                      _focusWithin={{
                        borderColor: emailError ? "red.400" : "brand.400",
                        bg: inputFocusBg,
                        boxShadow: "lg",
                      }}
                      transition="all 0.2s"
                    >
                      <Icon as={FiMail} color={emailError ? "red.400" : "brand.400"} flexShrink={0} />
                      <Input
                        variant="unstyled"
                        py={5}
                        type="email"
                        placeholder="john@example.com"
                        fontWeight="600"
                        color={inputTextColor}
                        _placeholder={{ color: placeholderColor, fontWeight: "400" }}
                        value={formData.email}
                        onChange={handleEmailChange}
                        onBlur={() => validateEmail(formData.email)}
                      />
                    </HStack>
                    {emailError && (
                      <FormErrorMessage mt={2} fontSize="xs" fontWeight="600">
                        {emailError}
                      </FormErrorMessage>
                    )}
                  </FormControl>

                  {/* ODude Ecosystem Toggle */}
                  <MotionBox
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    bg={odudeEnabled
                      ? useColorModeValue("purple.50", "rgba(128,90,213,0.12)")
                      : useColorModeValue("gray.50", "whiteAlpha.50")
                    }
                    border="2px solid"
                    borderColor={odudeEnabled
                      ? useColorModeValue("purple.300", "purple.600")
                      : useColorModeValue("gray.200", "gray.600")
                    }
                    borderRadius="2xl"
                    p={6}
                    cursor="pointer"
                    onClick={() => setOdudeEnabled(!odudeEnabled)}
                    sx={{ transition: "all 0.3s" }}
                  >
                    <Flex align="start" gap={4}>
                      {/* Wrap Switch in a Box that stops propagation to prevent double-toggle with container onClick */}
                      <Box mt={0.5} onClick={(e) => e.stopPropagation()}>
                        <Switch
                          size="lg"
                          colorScheme="purple"
                          isChecked={odudeEnabled}
                          onChange={(e) => setOdudeEnabled(e.target.checked)}
                        />
                      </Box>
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack spacing={2} flexWrap="wrap">
                          <Image 
                            src="/odude_logo.png" 
                            alt="ODude Logo" 
                            boxSize="24px" 
                            objectFit="contain"
                            filter={odudeEnabled ? "none" : "grayscale(100%) opacity(0.6)"}
                          />
                          <Text
                            fontWeight="800"
                            fontSize="sm"
                            color={odudeEnabled
                              ? useColorModeValue("purple.700", "purple.300")
                              : useColorModeValue("gray.700", "gray.300")
                            }
                          >
                            Enable this {subname} Web3 Name into ODude Ecosystem
                          </Text>
                          {odudeEnabled && (
                            <Badge
                              colorScheme="purple"
                              variant="solid"
                              borderRadius="full"
                              fontSize="2xs"
                              px={2}
                            >
                              ACTIVE
                            </Badge>
                          )}
                        </HStack>
                        <Text
                          fontSize="xs"
                          color={odudeEnabled
                            ? useColorModeValue("purple.600", "purple.400")
                            : "gray.500"
                          }
                          fontWeight="500"
                          lineHeight="tall"
                        >
                          After this you can create a{" "}
                          <Text as="span" fontWeight="800" color={odudeEnabled ? "purple.500" : "gray.500"}>
                            Link in Bio identity
                          </Text>{" "}
                          at{" "}
                          <Text
                            as="a"
                            href="https://odude.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            fontWeight="800"
                            color="purple.500"
                            textDecoration="underline"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            odude.com
                          </Text>
                          .
                        </Text>
                      </VStack>
                    </Flex>
                  </MotionBox>

                  <Box pt={4}>
                    <VStack spacing={5} align="stretch">
                      <Button
                        colorScheme="brand"
                        size="lg"
                        h="70px"
                        borderRadius="2xl"
                        fontSize="lg"
                        fontWeight="800"
                        leftIcon={<FiCheckCircle size={20} />}
                        onClick={handleSave}
                        isLoading={saving}
                        loadingText="Authenticating..."
                        boxShadow="0 20px 40px -10px rgba(66, 153, 225, 0.4)"
                        _hover={{ transform: "translateY(-2px)", boxShadow: "0 25px 50px -12px rgba(66, 153, 225, 0.5)" }}
                        _active={{ transform: "translateY(0)" }}
                      >
                        Verify &amp; Save Profile
                      </Button>

                      {/* Export Button - Card Style */}
                      <AnimatePresence>
                        {isExportReady && (
                          <MotionBox
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                          >
                            <Box
                              as="button"
                              w="full"
                              p={5}
                              bg={useColorModeValue("green.50", "rgba(72, 187, 120, 0.1)")}
                              border="2px solid"
                              borderColor={useColorModeValue("green.200", "green.500")}
                              borderRadius="2xl"
                              onClick={handleExport}
                              textAlign="left"
                              transition="all 0.3s"
                              _hover={{ 
                                transform: "translateY(-4px)", 
                                boxShadow: "0 15px 30px -10px rgba(72, 187, 120, 0.3)",
                                borderColor: "green.400",
                                bg: useColorModeValue("green.100", "rgba(72, 187, 120, 0.2)")
                              }}
                              _active={{ transform: "translateY(-1px)" }}
                            >
                              <Flex align="center" gap={4}>
                                <Flex 
                                  bg="green.500" 
                                  color="white" 
                                  p={3} 
                                  borderRadius="xl" 
                                  boxShadow="0 4px 12px rgba(72, 187, 120, 0.4)"
                                >
                                  <FiExternalLink size={20} />
                                </Flex>
                                <VStack align="start" spacing={0}>
                                  <Text fontWeight="900" fontSize="md" color={useColorModeValue("green.700", "green.300")}>
                                    Export to ODude Ecosystem
                                  </Text>
                                  <Text fontSize="xs" fontWeight="600" color={useColorModeValue("green.600", "green.400")}>
                                    Complete your Link in Bio setup at odude.com
                                  </Text>
                                </VStack>
                                <Spacer />
                                <Icon as={FiArrowLeft} rotate="180deg" transform="rotate(180deg)" color="green.400" />
                              </Flex>
                            </Box>
                          </MotionBox>
                        )}
                      </AnimatePresence>

                      <HStack justify="center" spacing={2} opacity={0.7}>
                        <Icon as={FiShield} color="green.400" />
                        <Text fontSize="xs" color="gray.500" fontWeight="bold">
                          Secured by cryptographic wallet signature
                        </Text>
                      </HStack>
                      <HStack
                        justify="center"
                        spacing={2}
                        bg={useColorModeValue("green.50", "whiteAlpha.100")}
                        border="1px solid"
                        borderColor={useColorModeValue("green.200", "green.800")}
                        borderRadius="xl"
                        px={4}
                        py={2}
                      >
                        <Icon as={FiZap} color="green.500" boxSize={3.5} />
                        <Text fontSize="xs" fontWeight="800" color={useColorModeValue("green.700", "green.300")}>
                          No gas fee — wallet is used for identity validation only
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                </VStack>
              </CardBody>
            </MotionCard>

            {/* Security Note */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              bg={useColorModeValue("brand.50", "whiteAlpha.100")}
              p={6}
              borderRadius="2xl"
              border="1px solid"
              borderColor="brand.100"
              _dark={{ borderColor: "brand.800" }}
            >
              <Flex align="start">
                <Icon as={FiShield} color="brand.500" mr={4} mt={1} boxSize={5} />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="800" fontSize="sm" color="brand.600" _dark={{ color: "brand.300" }}>
                    Identity Verified Ownership — Zero Gas Cost
                  </Text>
                  <Text fontSize="xs" fontWeight="500" color="gray.600" _dark={{ color: "gray.400" }}>
                    By signing this request, you prove that you are the unique owner of{" "}
                    <Text as="span" color="brand.500" fontWeight="700">{subname}</Text>. This ensures no one else
                    can modify your off-chain profile records.
                  </Text>
                  <HStack spacing={1.5} pt={1}>
                    <Icon as={FiZap} color="green.500" boxSize={3} />
                    <Text fontSize="xs" fontWeight="700" color={useColorModeValue("green.600", "green.400")}>
                      This update is completely free — no blockchain transaction or gas fee is required.
                      Your wallet connection is used solely to verify your identity.
                    </Text>
                  </HStack>
                </VStack>
              </Flex>
            </MotionBox>
          </MotionVStack>
        </AnimatePresence>
      </Container>
    </Web3PageContainer>
  );
}
