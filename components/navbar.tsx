"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { SignUpModal } from "@/components/auth/sign-up-modal";
import { User, FileText, BookOpen, GraduationCap, Briefcase, Building2, Search } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

interface NavbarProps {
  onRoleSelectionNeeded?: (userData: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  }) => void;
}

export function Navbar({ onRoleSelectionNeeded }: NavbarProps) {
  const pathname = usePathname();
  const [isSignInOpen, setIsSignInOpen] = React.useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = React.useState(false);

  // Custom nav items for job platform
  const navItems = [
    { name: "Find Jobs", url: "/", icon: Search },
    { name: "News and Opportunities", url: "/news", icon: Briefcase },
    { name: "Who are we", url: "/aboutus", icon: FileText },
  ];

  return (
    <>
      {/* Standalone Tubelight Navbar with Logo and Buttons */}
      <NavBar
        items={navItems}
        onSignIn={() => setIsSignInOpen(true)}
        onSignUp={() => setIsSignUpOpen(true)}
      />

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
        onRoleSelectionNeeded={onRoleSelectionNeeded}
      />

      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />
    </>
  );
}
