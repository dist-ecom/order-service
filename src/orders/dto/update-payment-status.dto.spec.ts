import { validate } from 'class-validator';
import { UpdatePaymentStatusDto } from './update-payment-status.dto';
import { PaymentStatus } from '../entities/order.entity';

describe('UpdatePaymentStatusDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new UpdatePaymentStatusDto();
      dto.paymentStatus = PaymentStatus.COMPLETED;
      dto.paymentIntentId = 'pi_123456789';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with only paymentStatus', async () => {
      const dto = new UpdatePaymentStatusDto();
      dto.paymentStatus = PaymentStatus.COMPLETED;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation without paymentStatus', async () => {
      const dto = new UpdatePaymentStatusDto();
      dto.paymentIntentId = 'pi_123456789';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('paymentStatus');
    });

    it('should fail validation with invalid paymentStatus', async () => {
      const dto = new UpdatePaymentStatusDto();
      dto.paymentStatus = 'invalid_status' as PaymentStatus;
      dto.paymentIntentId = 'pi_123456789';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('paymentStatus');
    });

    it('should pass validation with empty paymentIntentId', async () => {
      const dto = new UpdatePaymentStatusDto();
      dto.paymentStatus = PaymentStatus.COMPLETED;
      dto.paymentIntentId = '';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
}); 