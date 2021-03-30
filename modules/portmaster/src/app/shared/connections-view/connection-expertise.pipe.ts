import { Pipe, PipeTransform } from '@angular/core';
import { Connection, ExpertiseLevel } from 'src/app/services';

@Pipe({
    name: 'connExpertise',
    pure: true,
})
export class ConnectionExpertisePipe implements PipeTransform {
    transform(conn: Connection): ExpertiseLevel {
        if (conn.Internal) {
            return ExpertiseLevel.Developer;
        }
        if (conn.Entity.IP) {
            return ExpertiseLevel.User;
        }
        return ExpertiseLevel.Expert;
    }
}