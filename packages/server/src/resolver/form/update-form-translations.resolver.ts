import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { Auth, FormGuard } from '@decorator'
import { UpdateFormTranslationsInput } from '@graphql'
import { FormService } from '@service'

@Resolver()
@Auth()
export class UpdateFormTranslationsResolver {
  constructor(private readonly formService: FormService) {}

  /**
   * Update form translations
   */
  @Mutation(returns => Boolean)
  @FormGuard()
  async updateFormTranslations(
    @Args('input') input: UpdateFormTranslationsInput
  ): Promise<boolean> {
    return this.formService.updateTranslations(input.formId, input.language, input.translations)
  }
}
