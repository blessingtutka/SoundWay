// import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// export const UserAvatar = ({ user, className }: { user: User; className?: string }) => (
//     <Avatar className={`${className}`}>
//         {user.avatar ? <AvatarImage src={user.avatar} alt={user.name || user.email} /> : null}
//         <AvatarFallback className='bg-blue-400'>{(user.name || user.email).substring(0, 2).toUpperCase()}</AvatarFallback>
//     </Avatar>
// );
import { Avatar, AvatarBadge, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';

export function UserAvatar() {
    return (
        <Avatar size='md'>
            <AvatarFallbackText>Jane Doe</AvatarFallbackText>
            <AvatarImage
                source={{
                    uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
                }}
            />
            <AvatarBadge />
        </Avatar>
    );
}
