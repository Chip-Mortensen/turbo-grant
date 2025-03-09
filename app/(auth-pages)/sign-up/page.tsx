import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function SignUp(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an Account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your information below to create your account
        </p>
      </div>
      <div className="grid gap-6">
        <form className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="John"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="Doe"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" required>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Principal Investigator">Principal Investigator (PI)</SelectItem>
                <SelectItem value="Co-Principal Investigator">Co-Principal Investigator (Co-PI)</SelectItem>
                <SelectItem value="Co-Investigator">Co-Investigator (Co-I)</SelectItem>
                <SelectItem value="Senior Personnel">Senior Personnel</SelectItem>
                <SelectItem value="Postdoctoral Researcher">Postdoctoral Researcher</SelectItem>
                <SelectItem value="Graduate Student">Graduate Student</SelectItem>
                <SelectItem value="Undergraduate Student">Undergraduate Student</SelectItem>
                <SelectItem value="Project Administrator">Project Administrator</SelectItem>
                <SelectItem value="Authorized Organizational Representative">Authorized Organizational Representative (AOR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              required
            />
          </div>
          <SubmitButton formAction={signUpAction}>
            Sign Up
          </SubmitButton>
          <FormMessage message={searchParams} />
        </form>
        <Link
          href="/sign-in"
          className="text-sm text-center text-muted-foreground hover:text-brand underline underline-offset-4"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </>
  );
}
