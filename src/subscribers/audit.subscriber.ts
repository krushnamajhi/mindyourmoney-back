import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { DefaultEntity } from '../features/expensetracker/entities/default-entity';
import { context } from '../utils/apiUtils';

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<DefaultEntity> {

    // Listen only to entities that extend DefaultEntity
    listenTo() {
        return DefaultEntity;
    }

    beforeInsert(event: InsertEvent<DefaultEntity>) {
        try {
            const user = context().getUser();
            if (user && user.id && event.entity) {
                event.entity.createdByUserId = user.id;
                event.entity.updatedByUserId = user.id;
            }
        } catch (e) {
            // Ignore error when context is not available (e.g., seeding or background jobs)
        }
    }

    beforeUpdate(event: UpdateEvent<DefaultEntity>) {
        try {
            const user = context().getUser();
            if (user && user.id && event.entity) {
                event.entity.updatedByUserId = user.id;
            }
        } catch (e) {
            // Ignore error when context is not available
        }
    }
}
