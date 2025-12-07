// Google OAuth configuration
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "987266730923-tc532dfe6e7ninoci6f230svs5jidbrp.apps.googleusercontent.com";

class GoogleAuthService {
  private isGoogleScriptLoaded = false;
  private isLoading = false;

  /**
   * Load Google OAuth script dynamically
   */
  private async loadGoogleScript(): Promise<void> {
    if (this.isGoogleScriptLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isGoogleScriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error("Failed to load Google OAuth script"));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google OAuth
   */
  async initializeGoogleAuth(
    callback?: (response: any) => void
  ): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      await this.loadGoogleScript();

      // Wait for gapi to be available
      await this.waitForGoogleAPI();

      // Initialize Google OAuth
      if (window.google) {
        const config: any = {
          client_id: GOOGLE_CLIENT_ID,
        };

        if (callback) {
          config.callback = callback;
        }

        window.google.accounts.id.initialize(config);
      }
    } catch (error) {
      console.error("Failed to initialize Google OAuth:", error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Wait for Google API to be available
   */
  private waitForGoogleAPI(): Promise<void> {
    return new Promise((resolve) => {
      const checkGoogleAPI = () => {
        if (window.google && window.google.accounts) {
          resolve();
        } else {
          setTimeout(checkGoogleAPI, 100);
        }
      };
      checkGoogleAPI();
    });
  }

  /**
   * Handle Google OAuth response
   */
  private async handleGoogleResponse(response: any): Promise<void> {
    try {
      console.log("Google OAuth response received:", response);

      // Decode the JWT token
      const tokenData = this.decodeJWT(response.credential);
      console.log("Decoded token data:", tokenData);
    } catch (error) {
      console.error("Google authentication failed:", error);
      throw error;
    }
  }

  /**
   * Decode JWT token (basic implementation)
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Failed to decode JWT:", error);
      return null;
    }
  }

  /**
   * Trigger Google sign-in popup
   */
  async signInWithGoogle(isSignUp: boolean = false): Promise<string> {
    try {
      console.log("signInWithGoogle called, initializing...");

      return new Promise(async (resolve, reject) => {
        try {
          // Set up the callback first
          const callback = (response: any) => {
            console.log("Google OAuth callback triggered:", response);

            // Call the handleGoogleResponse for logging
            this.handleGoogleResponse(response);

            // Resolve with the credential
            console.log("Resolving promise with credential...");
            resolve(response.credential);
          };

          // Initialize with the callback
          await this.initializeGoogleAuth(callback);
          console.log("Google Auth initialized with callback...");

          if (window.google && window.google.accounts) {
            console.log("Google API available, calling prompt...");

            window.google.accounts.id.prompt((notification: any) => {
              console.log("Google prompt notification:", notification);

              if (notification.isNotDisplayed()) {
                const reason = notification.getNotDisplayedReason();
                console.log("Prompt not displayed, reason:", reason);
                // Check if suppressed by user or any other reason, fallback to popup
                if (reason === "suppressed_by_user" || reason === "browser_not_supported" || reason === "invalid_client") {
                  console.log("Prompt suppressed, using fallback popup...");
                  this.showGooglePopup(isSignUp, resolve, reject);
                } else {
                  // For other reasons, still try popup as fallback
                  console.log("Prompt not displayed, using fallback popup...");
                  this.showGooglePopup(isSignUp, resolve, reject);
                }
              } else if (notification.isSkippedMoment()) {
                console.log("Prompt skipped, using fallback popup...");
                // Fallback to popup
                this.showGooglePopup(isSignUp, resolve, reject);
              } else if (notification.isDismissedMoment()) {
                console.log(
                  "Prompt dismissed, checking if credential was returned..."
                );
                // The prompt was dismissed, but we need to check if a credential was returned
                const dismissedReason = notification.getDismissedReason();
                if (dismissedReason === "credential_returned") {
                  console.log(
                    "Credential was returned, but callback should have been called"
                  );
                  reject(
                    new Error("Credential returned but callback not triggered")
                  );
                } else {
                  reject(new Error("User dismissed the prompt"));
                }
              }
            });
          } else {
            console.error("Google OAuth not initialized");
            reject(new Error("Google OAuth not initialized"));
          }
        } catch (error) {
          console.error("Error in signInWithGoogle promise:", error);
          reject(error);
        }
      });
    } catch (error) {
      console.error("Google sign-in failed:", error);
      throw error;
    }
  }

  /**
   * Show Google popup for authentication
   */
  private showGooglePopup(
    isSignUp: boolean,
    resolve: Function,
    reject: Function
  ): void {
    try {
      console.log("Showing Google popup...");

      if (window.google && window.google.accounts) {
        // Create a temporary button element
        const buttonElement = document.createElement("div");
        buttonElement.style.position = "absolute";
        buttonElement.style.left = "-9999px";
        buttonElement.style.top = "-9999px";
        buttonElement.style.visibility = "hidden";
        document.body.appendChild(buttonElement);

        // Set up the callback for the popup
        const popupCallback = (response: any) => {
          console.log("Google popup callback triggered:", response);
          try {
            document.body.removeChild(buttonElement);
          } catch (e) {
            // Element might already be removed
          }
          resolve(response.credential);
        };

        // Render the Google button
        window.google.accounts.id.renderButton(buttonElement, {
          theme: "outline",
          size: "large",
          text: isSignUp ? "signup_with" : "signin_with",
          width: 250,
          callback: popupCallback,
        });

        // Wait a bit for the button to render, then click it
        setTimeout(() => {
          try {
            const button = buttonElement.querySelector(
              'div[role="button"]'
            ) as HTMLElement;
            if (button) {
              console.log("Clicking Google button to trigger popup...");
              button.click();
            } else {
              console.error("Google button not found in popup");
              document.body.removeChild(buttonElement);
              reject(
                new Error("Failed to trigger Google popup - button not found")
              );
            }
          } catch (error) {
            console.error("Error clicking Google button:", error);
            try {
              document.body.removeChild(buttonElement);
            } catch (e) {
              // Element might already be removed
            }
            reject(new Error("Failed to trigger Google popup"));
          }
        }, 200);
      } else {
        reject(new Error("Google OAuth not available"));
      }
    } catch (error) {
      console.error("Error showing Google popup:", error);
      reject(error);
    }
  }
}

export const googleAuthService = new GoogleAuthService();

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

