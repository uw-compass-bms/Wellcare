"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">UW Compass</h1>
          <h2 className="text-lg text-gray-600">Sign in to your account</h2>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: {
                  backgroundColor: "#2563eb",
                  fontSize: "14px",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#1d4ed8"
                  }
                },
                card: {
                  boxShadow: "none"
                }
              }
            }}
            redirectUrl="/app/document-verification"
          />
        </div>
      </div>
    </div>
  );
} 