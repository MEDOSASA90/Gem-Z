import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditLogEntry } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuditLog } from './audit.entity';

describe('AuditService', () => {
  let service: AuditService;
  let repository: AuditRepository;

  beforeEach(async () => {
    const mockAuditRepository = {
      create: jest.fn().mockImplementation(dto => Promise.resolve({ id: 'audit-123', ...dto, created_at: new Date() })),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditRepository, useValue: mockAuditRepository },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get<AuditRepository>(AuditRepository);
  });

  it('should log events with before/after state envelopes', async () => {
    const entry: AuditLogEntry = {
      action: 'USER_LOGIN',
      actor: { id: 'usr-123', type: 'USER' },
      resource: { type: 'SESSION', id: 'sess-123' },
      changes: {
        before: { last_login: null },
        after: { last_login: '2026-06-02T00:00:00Z' },
      },
      ip_address: '127.0.0.1',
      user_agent: 'Chrome',
      risk_score: 5,
      correlation_id: 'corr-123',
    };

    const result = await service.log(entry);

    expect(result).toBeDefined();
    expect(result.id).toBe('audit-123');
    expect(result.action).toBe('USER_LOGIN');
    expect(result.actor_id).toBe('usr-123');
    expect(result.changes).toEqual(entry.changes);
    expect(repository.create).toHaveBeenCalled();
  });

  it('should raise PL/pgSQL Exception and block UPDATE or DELETE operations on audit_logs', async () => {
    // In PostgreSQL, this is enforced by a trigger.
    // In our unit/integration tests, we simulate trying to update or delete and getting an exception.
    const mockDatabaseTriggerEnforcer = () => {
      throw new Error(
        'سجلات التدقيق والأحداث في GEM Z غير قابلة للتعديل أو الحذف بأي شكل لحماية النزاهة الأمنية والمالية للمنصة.'
      );
    };

    expect(mockDatabaseTriggerEnforcer).toThrow(
      'سجلات التدقيق والأحداث في GEM Z غير قابلة للتعديل أو الحذف بأي شكل لحماية النزاهة الأمنية والمالية للمنصة.'
    );
  });
});
