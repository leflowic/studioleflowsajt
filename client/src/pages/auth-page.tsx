import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Music } from "lucide-react";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { VerificationModal } from "@/components/VerificationModal";

const loginSchema = z.object({
  username: z.string().min(3, "Korisničko ime mora imati najmanje 3 karaktera"),
  password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera"),
});

const registerSchema = insertUserSchema.extend({
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Lozinke se ne poklapaju",
  path: ["passwordConfirm"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  const initialTab = location === "/registracija" ? "register" : "login";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{ id: number; email: string } | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      passwordConfirm: "",
    },
  });

  useEffect(() => {
    if (user !== null) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onLoginSubmit = async (data: LoginFormData) => {
    await loginMutation.mutateAsync(data);
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    const { passwordConfirm, ...registerData } = data;
    try {
      const result = await registerMutation.mutateAsync(registerData);
      setRegisteredUser({ id: result.id, email: result.email });
      setShowVerificationModal(true);
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  const handleVerificationSuccess = () => {
    setShowVerificationModal(false);
    setRegisteredUser(null);
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Music className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold font-[Montserrat]">Studio LeFlow</h1>
            </div>
            <p className="text-muted-foreground">
              Prijavite se ili kreirajte nalog
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">
                Prijava
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">
                Registracija
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Korisničko ime</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Unesite korisničko ime"
                            autoComplete="username"
                            data-testid="input-username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lozinka</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Unesite lozinku"
                            autoComplete="current-password"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Prijavljivanje..." : "Prijavite se"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Unesite email adresu"
                            autoComplete="email"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Korisničko ime</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Unesite korisničko ime"
                            autoComplete="username"
                            data-testid="input-username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lozinka</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Unesite lozinku"
                            autoComplete="new-password"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="passwordConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potvrda lozinke</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Ponovite lozinku"
                            autoComplete="new-password"
                            data-testid="input-password-confirm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? "Registracija..." : "Registrujte se"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-12 text-white">
          <div className="mb-8">
            <Music className="w-24 h-24 mx-auto mb-6" />
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 tracking-tight font-[Montserrat]">
            Studio LeFlow Community
          </h2>
          
          <p className="text-xl lg:text-2xl max-w-lg leading-relaxed text-white/90">
            Pridružite se zajednici muzičkih producenata. Učestvujte u mesečnim giveaway konkursima i osvajajte besplatne studio termine.
          </p>
        </div>
      </div>

      {registeredUser && (
        <VerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          userId={registeredUser.id}
          email={registeredUser.email}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  );
}
