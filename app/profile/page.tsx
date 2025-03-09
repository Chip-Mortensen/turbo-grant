import { createClient } from "@/utils/supabase/server";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/app/actions";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PhoneInput from "@/components/ui/phone-input";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p>You need to be signed in to view your profile.</p>
      </div>
    );
  }

  // Fetch the user profile data
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch organizations for the dropdown
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name')
    .order('name');

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-6">
            <input type="hidden" name="id" value={user.id} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input 
                  id="first_name" 
                  name="first_name" 
                  defaultValue={profile?.first_name || ''} 
                  placeholder="Enter your first name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input 
                  id="last_name" 
                  name="last_name" 
                  defaultValue={profile?.last_name || ''} 
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  defaultValue={user.email || ''} 
                  disabled
                />
                <p className="text-sm text-muted-foreground">Your email cannot be changed</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <PhoneInput 
                  id="phone" 
                  name="phone" 
                  defaultValue={profile?.phone || ''} 
                />
                <p className="text-sm text-muted-foreground">Format: (XXX) XXX-XXXX</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={profile?.role || ''}>
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
              
              <div className="space-y-2">
                <Label>Institution</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    value={organizations?.find(org => org.id === profile?.institution_id)?.name || 'No institution selected'} 
                    disabled
                  />
                  <Button variant="outline" asChild className="shrink-0">
                    <Link href="/organizations/select">
                      Change
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="era_commons_id">eRA Commons ID</Label>
                <Input 
                  id="era_commons_id" 
                  name="era_commons_id" 
                  defaultValue={profile?.era_commons_id || ''} 
                  placeholder="Enter your eRA Commons ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orcid">ORCID</Label>
                <Input 
                  id="orcid" 
                  name="orcid" 
                  defaultValue={profile?.orcid || ''} 
                  placeholder="Enter your ORCID"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Details about your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Account Created</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(user.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 